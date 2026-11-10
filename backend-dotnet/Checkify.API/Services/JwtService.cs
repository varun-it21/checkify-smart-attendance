using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Checkify.API.Configurations;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Checkify.API.Services;

public class JwtService : IJwtService
{
    private readonly JwtSettings _settings;
    private readonly byte[] _secretKey;

    public JwtService(IOptions<JwtSettings> options)
    {
        _settings = options.Value;

        _secretKey = Convert.FromBase64String(_settings.Secret);
    }

    public (string Token, DateTime ExpiresAt) GenerateToken(User user)
    {
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(_settings.ExpiryMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name", user.Name),
            new Claim("role", user.Role.Trim().ToUpperInvariant()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(_secretKey),
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: now,
            expires: expiresAt,
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return (tokenString, expiresAt);
    }
}

