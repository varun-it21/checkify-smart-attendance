using System.Security.Cryptography;
using System.Text;
using Checkify.API.Services.Interfaces;

namespace Checkify.API.Services;

public class QrService : IQrService
{
    private const int TokenEntropyBytes = 32;

    public string GenerateToken()
    {
        var bytes = new byte[TokenEntropyBytes];
        RandomNumberGenerator.Fill(bytes);

        // URL-safe Base64 without padding
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    public string HashToken(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }

    public bool VerifyToken(string token, string storedHash)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(storedHash))
            return false;

        var computedHash = HashToken(token);

        var computedBytes = Encoding.UTF8.GetBytes(computedHash);
        var storedBytes = Encoding.UTF8.GetBytes(storedHash);

        if (computedBytes.Length != storedBytes.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(computedBytes, storedBytes);
    }
}

