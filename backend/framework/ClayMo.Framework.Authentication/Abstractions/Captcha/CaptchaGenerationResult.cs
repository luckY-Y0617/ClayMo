namespace ClayMo.Framework.Authentication.Abstractions.Captcha;

public record CaptchaGenerationResult(
    string Identifier,
    string? ImageBase64,
    TimeSpan ExpiresIn);