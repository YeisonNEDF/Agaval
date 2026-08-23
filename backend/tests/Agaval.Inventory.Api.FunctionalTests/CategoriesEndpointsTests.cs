using System.Net;
using System.Net.Http.Json;
using Agaval.Inventory.Api.Contracts.Categories;
using Agaval.Inventory.Application.Features.Categories;

namespace Agaval.Inventory.Api.FunctionalTests;

public sealed class CategoriesEndpointsTests
{
    [Fact]
    public async Task CategoryLifecycleRequiresAuthenticationAndPreservesInactiveRecord()
    {
        await using var factory = new InventoryApiFactory();
        using var client = factory.CreateClient();

        var unauthorizedResponse = await client.PostAsJsonAsync(
            "/api/categorias",
            new CreateCategoryRequest("Ferretería"));
        Assert.Equal(HttpStatusCode.Unauthorized, unauthorizedResponse.StatusCode);

        await client.AuthenticateManagerAsync();
        var createResponse = await client.PostAsJsonAsync(
            "/api/categorias",
            new CreateCategoryRequest("Ferretería"));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<CategoryDto>();
        Assert.NotNull(created);
        Assert.True(created.IsActive);

        var duplicateResponse = await client.PostAsJsonAsync(
            "/api/categorias",
            new CreateCategoryRequest("Ferretería"));
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/categorias/{created.Id}",
            new UpdateCategoryRequest("Herramientas", true));
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var deleteResponse = await client.DeleteAsync($"/api/categorias/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var categories = await client.GetFromJsonAsync<CategoryDto[]>(
            "/api/categorias?incluirInactivas=true");
        Assert.NotNull(categories);
        Assert.Contains(categories, category => category.Id == created.Id && !category.IsActive);
    }
}
