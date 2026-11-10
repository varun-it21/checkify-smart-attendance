using Checkify.API.Data;
using Checkify.API.DTOs.Admin;
using Checkify.API.Entities;
using Checkify.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Checkify.API.Services;

public class SystemSettingService : ISystemSettingService
{
    private readonly CheckifyDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SystemSettingService> _logger;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

    public SystemSettingService(
        CheckifyDbContext db,
        IMemoryCache cache,
        ILogger<SystemSettingService> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    private async Task EnsureDefaultsSeededAsync(CancellationToken cancellationToken)
    {
        if (await _db.SystemSettings.AnyAsync(cancellationToken))
            return;

        var defaults = new List<SystemSetting>
        {
            new() { Key = "INSTITUTION_NAME", Value = "Checkify Institute of Technology", Category = "GENERAL", Description = "Name of the institution" },
            new() { Key = "ACADEMIC_YEAR", Value = "2026-2027", Category = "ACADEMIC", Description = "Current active academic calendar year" },
            new() { Key = "SEMESTER_TERM", Value = "ODD", Category = "ACADEMIC", Description = "Current academic term (ODD / EVEN)" },
            new() { Key = "MIN_ATTENDANCE_PERCENTAGE", Value = "75.0", Category = "ATTENDANCE", Description = "Minimum attendance percentage before defaulter warning is issued" },
            new() { Key = "CRITICAL_TURNOUT_PERCENTAGE", Value = "50.0", Category = "ATTENDANCE", Description = "Session turnout threshold strictly below which department HOD is alerted" },
            new() { Key = "OTP_EXPIRY_SECONDS", Value = "120", Category = "SECURITY", Description = "Lifetime of session OTP code in seconds" },
            new() { Key = "QR_REFRESH_SECONDS", Value = "15", Category = "SECURITY", Description = "Rotation interval for dynamic QR tokens in seconds" }
        };

        _db.SystemSettings.AddRange(defaults);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SystemSettingResponse>> GetAllSettingsAsync(CancellationToken cancellationToken = default)
    {
        await EnsureDefaultsSeededAsync(cancellationToken);

        var list = await _db.SystemSettings
            .Include(s => s.UpdatedByUser)
            .AsNoTracking()
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Key)
            .Select(s => new SystemSettingResponse
            {
                Key = s.Key,
                Value = s.Value,
                Category = s.Category,
                Description = s.Description,
                UpdatedAt = s.UpdatedAt,
                UpdatedByName = s.UpdatedByUser != null ? s.UpdatedByUser.Name : null
            })
            .ToListAsync(cancellationToken);

        return list;
    }

    public async Task<SystemSettingResponse> UpdateSettingAsync(
        string key,
        string value,
        int updatedByUserId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Setting key cannot be empty.");

        await EnsureDefaultsSeededAsync(cancellationToken);

        var setting = await _db.SystemSettings
            .Include(s => s.UpdatedByUser)
            .FirstOrDefaultAsync(s => s.Key == key.Trim().ToUpperInvariant(), cancellationToken);

        if (setting == null)
            throw new KeyNotFoundException($"Setting with key '{key}' not found.");

        setting.Value = value.Trim();
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedByUserId = updatedByUserId;

        await _db.SaveChangesAsync(cancellationToken);

        // Invalidate cache
        _cache.Remove($"sys_setting_{setting.Key}");

        var user = await _db.Users.FindAsync(new object[] { updatedByUserId }, cancellationToken);

        return new SystemSettingResponse
        {
            Key = setting.Key,
            Value = setting.Value,
            Category = setting.Category,
            Description = setting.Description,
            UpdatedAt = setting.UpdatedAt,
            UpdatedByName = user?.Name
        };
    }

    public async Task<decimal> GetSettingDecimalAsync(string key, decimal defaultValue, CancellationToken cancellationToken = default)
    {
        var raw = await GetSettingStringAsync(key, defaultValue.ToString("F1"), cancellationToken);
        if (decimal.TryParse(raw, out var val))
            return val;
        return defaultValue;
    }

    public async Task<int> GetSettingIntAsync(string key, int defaultValue, CancellationToken cancellationToken = default)
    {
        var raw = await GetSettingStringAsync(key, defaultValue.ToString(), cancellationToken);
        if (int.TryParse(raw, out var val))
            return val;
        return defaultValue;
    }

    public async Task<string> GetSettingStringAsync(string key, string defaultValue, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"sys_setting_{key.Trim().ToUpperInvariant()}";
        if (_cache.TryGetValue(cacheKey, out string? cached) && cached != null)
        {
            return cached;
        }

        try
        {
            var setting = await _db.SystemSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == key.Trim().ToUpperInvariant(), cancellationToken);

            var value = setting?.Value ?? defaultValue;
            _cache.Set(cacheKey, value, CacheTtl);
            return value;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read setting '{Key}' from DB. Falling back to default '{DefaultValue}'", key, defaultValue);
            return defaultValue;
        }
    }
}

