using System.Security.Cryptography;
using System.Text;
using Checkify.API.Services.Interfaces;

namespace Checkify.API.Services;

public class OtpService : IOtpService
{
    private readonly byte[] _pepper;

    public OtpService(IConfiguration configuration)
    {
        var encodedPepper = configuration["Attendance:OtpPepper"];

        if (string.IsNullOrWhiteSpace(encodedPepper))
        {
            throw new InvalidOperationException(
                "Attendance OTP pepper is not configured.");
        }

        try
        {
            _pepper = Convert.FromBase64String(encodedPepper);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException(
                "Attendance OTP pepper must be valid Base64.");
        }

        if (_pepper.Length < 32)
        {
            throw new InvalidOperationException(
                "Attendance OTP pepper must contain at least 32 bytes.");
        }
    }

    public string GenerateCode()
    {
        return RandomNumberGenerator
            .GetInt32(0, 1_000_000)
            .ToString("D6");
    }

    public string HashCode(string code)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code);

        var hash = HMACSHA256.HashData(
            _pepper,
            Encoding.UTF8.GetBytes(code));

        return Convert.ToHexString(hash);
    }

    public bool VerifyCode(string code, string storedHash)
    {
        if (string.IsNullOrWhiteSpace(code) ||
            string.IsNullOrWhiteSpace(storedHash))
        {
            return false;
        }

        try
        {
            var expectedHash = Convert.FromHexString(storedHash);

            var actualHash = HMACSHA256.HashData(
                _pepper,
                Encoding.UTF8.GetBytes(code));

            return CryptographicOperations.FixedTimeEquals(
                actualHash,
                expectedHash);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

