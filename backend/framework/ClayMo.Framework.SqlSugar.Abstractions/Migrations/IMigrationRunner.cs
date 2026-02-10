namespace ClayMo.Framework.SqlSugar.Abstractions.Migrations;

public interface IMigrationRunner
{
    Task<MigrationResult> MigrateAsync(MigrationRequest request, CancellationToken cancellationToken = default);
}