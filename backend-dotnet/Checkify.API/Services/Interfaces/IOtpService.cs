namespace Checkify.API.Services.Interfaces;

public interface IOtpService
{
    string GenerateCode();

    string HashCode(string code);

    bool VerifyCode(string code, string storedHash);
}

