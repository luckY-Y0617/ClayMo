using System.CommandLine;
using ClayMo.Tools.Platform;

var root = new RootCommand("ClayMo admin tool");

root.AddCommand(MigrateCommand.Build());
root.AddCommand(SeedCommand.Build());

return await root.InvokeAsync(args);