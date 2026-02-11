using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// 添加 YARP 反向代理服务
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// CORS 配置 - 统一在网关层处理，后端服务不再需要 CORS 配置
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // 如果配置了通配符或者没有配置 CORS，允许所有来源
        if (corsOrigins.Length == 0 || corsOrigins.Contains("*"))
        {
            policy.AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();
        }
        else
        {
            policy.WithOrigins(corsOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
    });
});

// 配置转发头（让后端知道原始请求是 HTTPS）
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | 
                               ForwardedHeaders.XForwardedProto |
                               ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ========================================
// 子域名配置
// ========================================
var adminHostPrefix = builder.Configuration.GetValue<string>("Domains:AdminPrefix") ?? "admin.";

var app = builder.Build();

// 必须在最前面使用转发头中间件
app.UseForwardedHeaders();

app.UseCors("AllowFrontend");

// ========================================
// 静态文件服务 - 基于子域名路由
// ========================================
var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var adminRoot = Path.Combine(webRoot, "admin");
var webFrontendRoot = Path.Combine(webRoot, "web");

// 配置 MIME 类型
var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".js"] = "application/javascript";
contentTypeProvider.Mappings[".mjs"] = "application/javascript";
contentTypeProvider.Mappings[".css"] = "text/css";
contentTypeProvider.Mappings[".json"] = "application/json";
contentTypeProvider.Mappings[".woff"] = "font/woff";
contentTypeProvider.Mappings[".woff2"] = "font/woff2";

// 缓存策略：静态资源缓存 1 年，HTML 不缓存
void SetCacheHeaders(StaticFileResponseContext ctx)
{
    if (ctx.File.Name.Contains('.') && !ctx.File.Name.EndsWith(".html"))
    {
        ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
    }
    else
    {
        ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
    }
}

// 判断当前请求是否来自 Admin 子域名
// 例如: admin.claymo.local, admin.example.com
bool IsAdminHost(HttpContext context) =>
    context.Request.Host.Host.StartsWith(adminHostPrefix, StringComparison.OrdinalIgnoreCase);

// Admin 子域名 (admin.*) - 静态文件
if (Directory.Exists(adminRoot))
{
    var adminFileProvider = new PhysicalFileProvider(adminRoot);

    app.UseWhen(IsAdminHost, adminApp =>
    {
        adminApp.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = adminFileProvider,
            RequestPath = "",
            ContentTypeProvider = contentTypeProvider,
            OnPrepareResponse = SetCacheHeaders
        });
    });
}

// Web 主域名 (*) - 静态文件
if (Directory.Exists(webFrontendRoot))
{
    var webFileProvider = new PhysicalFileProvider(webFrontendRoot);

    app.UseWhen(ctx => !IsAdminHost(ctx), webApp =>
    {
        webApp.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = webFileProvider,
            RequestPath = "",
            ContentTypeProvider = contentTypeProvider,
            OnPrepareResponse = SetCacheHeaders
        });
    });
}

// 客户端类型标记 - 供后端 Smart Scheme 判断认证方式
app.Use(async (context, next) =>
{
    // 防止客户端伪造：先移除再设置
    context.Request.Headers.Remove("X-Client-Type");
    context.Request.Headers["X-Client-Type"] = IsAdminHost(context) ? "admin" : "web";
    await next();
});

// 健康检查端点
app.MapGet("/health", () => Results.Ok("OK"));

// 映射 YARP 反向代理端点（API 和文件服务，不区分域名）
app.MapReverseProxy();

// ========================================
// SPA 回退 - 基于子域名返回对应 index.html
// ========================================
app.MapFallback(async context =>
{
    var path = context.Request.Path.Value ?? "";
    
    // API 和文件服务请求不处理（由 YARP 处理）
    if (path.StartsWith("/api/") || path.StartsWith("/fs/"))
    {
        context.Response.StatusCode = 404;
        return;
    }
    
    // 根据子域名选择对应的 index.html
    var indexPath = IsAdminHost(context)
        ? Path.Combine(adminRoot, "index.html")
        : Path.Combine(webFrontendRoot, "index.html");
    
    if (File.Exists(indexPath))
    {
        context.Response.ContentType = "text/html";
        context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        await context.Response.SendFileAsync(indexPath);
        return;
    }
    
    context.Response.StatusCode = 404;
});

app.Run();
