using Agaval.Inventory.Application;
using Agaval.Inventory.Domain.Entities;

namespace Agaval.Inventory.Application.UnitTests;

public sealed class ArchitectureDependencyTests
{
    [Fact]
    public void DomainDoesNotReferenceOuterLayersOrFrameworks()
    {
        var references = typeof(Product).Assembly
            .GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .ToHashSet(StringComparer.Ordinal);

        Assert.DoesNotContain("Agaval.Inventory.Application", references);
        Assert.DoesNotContain("Agaval.Inventory.Infrastructure", references);
        Assert.DoesNotContain("Agaval.Inventory.Api", references);
        Assert.DoesNotContain("Microsoft.EntityFrameworkCore", references);
    }

    [Fact]
    public void ApplicationDoesNotReferenceInfrastructureOrApi()
    {
        var references = typeof(DependencyInjection).Assembly
            .GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .ToHashSet(StringComparer.Ordinal);

        Assert.DoesNotContain("Agaval.Inventory.Infrastructure", references);
        Assert.DoesNotContain("Agaval.Inventory.Api", references);
    }
}
