using Checkify.API.DTOs.Auth;

namespace Checkify.API.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default
    );
}

