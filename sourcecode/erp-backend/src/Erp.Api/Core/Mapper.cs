using System.Reflection;

namespace Erp.Api.Core;

/// <summary>
/// Mapper phản chiếu tối giản cho scaffold:
/// - ToDto: tạo record DTO từ entity (khớp tên tham số constructor ↔ property entity).
/// - Apply: copy property DTO → entity theo tên (skipNulls cho update kiểu PATCH).
/// </summary>
public static class Mapper
{
    public static TOut ToDto<TOut>(object src)
    {
        var srcProps = src.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .ToDictionary(p => p.Name, p => p, StringComparer.OrdinalIgnoreCase);

        var ctor = typeof(TOut).GetConstructors()
            .OrderByDescending(c => c.GetParameters().Length)
            .First();

        var args = ctor.GetParameters().Select(p =>
        {
            if (srcProps.TryGetValue(p.Name!, out var sp))
                return sp.GetValue(src);
            return p.HasDefaultValue ? p.DefaultValue
                 : p.ParameterType.IsValueType ? Activator.CreateInstance(p.ParameterType) : null;
        }).ToArray();

        return (TOut)ctor.Invoke(args);
    }

    public static void Apply(object dto, object entity, bool skipNulls)
    {
        var entProps = entity.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.CanWrite)
            .ToDictionary(p => p.Name, p => p, StringComparer.OrdinalIgnoreCase);

        foreach (var dp in dto.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var value = dp.GetValue(dto);
            if (skipNulls && value is null) continue;
            if (!entProps.TryGetValue(dp.Name, out var ep)) continue;

            var targetType = Nullable.GetUnderlyingType(ep.PropertyType) ?? ep.PropertyType;
            if (value is not null && !targetType.IsAssignableFrom(value.GetType()))
                value = Convert.ChangeType(value, targetType);
            ep.SetValue(entity, value);
        }
    }
}
