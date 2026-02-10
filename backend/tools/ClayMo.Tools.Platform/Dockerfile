# ================================================
# ClayMo CLI Tool - Database Migration & Seeding
# ================================================
# Usage:
#   docker run claymo-cli migrate host
#   docker run claymo-cli migrate tenants --only-ready
#   docker run claymo-cli seed host
#   docker run claymo-cli seed tenants --only-ready
# ================================================

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER root
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /main
COPY . .
WORKDIR "/main/tools/ClayMo.Tools.Platform"
RUN dotnet restore "ClayMo.Tools.Platform.csproj"

FROM build AS publish
WORKDIR "/main/tools/ClayMo.Tools.Platform"
RUN dotnet publish "ClayMo.Tools.Platform.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ClayMo.Tools.Platform.dll"]

