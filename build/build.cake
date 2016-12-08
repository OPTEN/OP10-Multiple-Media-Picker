#addin "Cake.FileHelpers"
#addin "nuget:http://nuget.oss-concept.ch/nuget/?package=Opten.Cake"

var target = Argument("target", "Default");

var dest = Directory("./artifacts");
var umb = dest + Directory("_umbraco");
string version = null;

// Cleanup

Task("Clean")
	.Does(() =>
{
	if (DirectoryExists(dest))
	{
		CleanDirectory(dest);
		DeleteDirectory(dest, recursive: true);
	}
});

// Versioning

Task("Version") 
	.IsDependentOn("Clean") 
	.Does(() =>
{
	if (DirectoryExists(dest) == false)
	{
		CreateDirectory(dest);
	}

	version = "1.1.0";

	PatchAssemblyInfo("../OP10.MultipleMediaPicker/Properties/AssemblyInfo.cs", version);
	
	FileWriteText(dest + File("OP10.MultipleMediaPicker.variables.txt"), "version=" + version);

	Information("Patch files with ?v: {0}", ReplaceTextInFiles(
       "../OP10.MultipleMediaPicker/App_Plugins/**/*",
       "?v=ASSEMBLY_VERSION",
       "?v=" + version
	).Count());
	
	Information("Patch files with &v: {0}", ReplaceTextInFiles(
       "../OP10.MultipleMediaPicker/App_Plugins/**/*",
       "&v=ASSEMBLY_VERSION",
       "&v=" + version
	).Count());
});

// Building

Task("Restore-NuGet-Packages") 
	.IsDependentOn("Version") 
	.Does(() =>
{ 
	NuGetRestore("../OP10.MultipleMediaPicker.sln", new NuGetRestoreSettings {
		NoCache = true
	}); 
});

Task("Build") 
	.IsDependentOn("Restore-NuGet-Packages") 
	.Does(() =>
{
	MSBuild("../OP10.MultipleMediaPicker/OP10.MultipleMediaPicker.csproj", settings =>
		settings.SetConfiguration("Release"));

	// Copy files to artifacts for Umbraco Package
	CopyDirectory(Directory("../OP10.MultipleMediaPicker/App_Plugins/OP10.MultipleMediaPicker"), umb + Directory("App_Plugins/OP10.MultipleMediaPicker"));
	CreateDirectory(umb + Directory("bin"));
	CopyFileToDirectory(File("../OP10.MultipleMediaPicker/bin/OP10.MultipleMediaPicker.dll"), umb + Directory("bin"));
	CopyFileToDirectory(File("package.xml"), umb);
	
	Information("Patch package.xml: {0}", ReplaceTextInFiles(
       umb + File("package.xml"),
       "$ASSEMBLY_VERSION$",
       version
	).Count());
});

Task("Pack")
	.IsDependentOn("Build")
	.Does(() =>
{
	// NuGet
	NuGetPack("./OP10.MultipleMediaPicker.nuspec", new NuGetPackSettings {
		Version = version,
		BasePath = umb,
		OutputDirectory = dest
	});

	// Umbraco
	MSBuild("./UmbracoPackage.proj", settings =>
		settings.SetConfiguration("Release")
			    .WithTarget("Package")
				.WithProperty("BuildDir", MakeAbsolute(umb).FullPath.Replace("/", "\\"))
				.WithProperty("ArtifactsDir", dest));
});

// Deploying

Task("Deploy")
	.Does(() =>
{
	string packageId = "OP10.MultipleMediaPicker";

	// Get the Version from the .txt file
	version = EnvironmentVariable("bamboo_inject_" + packageId.Replace(".", "_") + "_version");

	// Get the path to the package
	var package = File(packageId + "." + version + ".nupkg");             

	// Push the package
	NuGetPush(package, new NuGetPushSettings {
		Source = "https://www.nuget.org/api/v2/package",
		ApiKey = EnvironmentVariable("NUGET_API_KEY")
	});

	// Notifications
	Slack();
});

Task("Default")
	.IsDependentOn("Pack");

RunTarget(target);
