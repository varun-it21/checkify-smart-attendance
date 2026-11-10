using Checkify.API.Entities;

namespace Checkify.API.Services.Interfaces;

public interface IJwtService
{
    (string Token, DateTime ExpiresAt) GenerateToken(User user);
}

