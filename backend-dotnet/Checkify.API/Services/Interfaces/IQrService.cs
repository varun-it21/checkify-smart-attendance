namespace Checkify.API.Services.Interfaces;

public interface IQrService
{
    string GenerateToken();

    string HashToken(string token);

    bool VerifyToken(string token, string storedHash);
}

