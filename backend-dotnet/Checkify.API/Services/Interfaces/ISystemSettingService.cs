using Checkify.API.DTOs.Admin;

namespace Checkify.API.Services.Interfaces;

public interface ISystemSettingService
{
    Task<IReadOnlyList<SystemSettingResponse>> GetAllSettingsAsync(CancellationToken cancellationToken = default);
    Task<SystemSettingResponse> UpdateSettingAsync(string key, string value, int updatedByUserId, CancellationToken cancellationToken = default);
    Task<decimal> GetSettingDecimalAsync(string key, decimal defaultValue, CancellationToken cancellationToken = default);
    Task<int> GetSettingIntAsync(string key, int defaultValue, CancellationToken cancellationToken = default);
    Task<string> GetSettingStringAsync(string key, string defaultValue, CancellationToken cancellationToken = default);
}

