using System.Net;
using System.Net.Http.Json;
using Agaval.Inventory.Api.Contracts.Products;
using Agaval.Inventory.Application.Features.Products;

namespace Agaval.Inventory.Api.FunctionalTests;

public sealed class ProductsEndpointsTests
{
    [Fact]
    public async Task ProductLifecycleWorksThroughHttpContract()
    {
        await using var factory = new InventoryApiFactory();
        using var client = factory.CreateClient();

        var invalidResponse = await client.PostAsJsonAsync(
            "/api/productos",
            new CreateProductRequest(string.Empty, null, 0, -1, -1, 0));

        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);

        var createResponse = await client.PostAsJsonAsync(
            "/api/productos",
            new CreateProductRequest(
                "Teclado mecánico",
                "Switches táctiles",
                249_900m,
                4,
                2,
                1));

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(created);
        Assert.Equal("Teclado mecánico", created.Name);
        Assert.Equal($"/api/productos/{created.Id}", createResponse.Headers.Location?.AbsolutePath);

        var readResponse = await client.GetAsync($"/api/productos/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, readResponse.StatusCode);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/productos/{created.Id}",
            new UpdateProductRequest(
                "Teclado mecánico Pro",
                "Distribución en español",
                299_900m,
                3,
                5,
                2));

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(updated);
        Assert.Equal("Teclado mecánico Pro", updated.Name);
        Assert.Equal("Oficina", updated.CategoryName);
        Assert.True(updated.IsLowStock);

        var lowStockProducts = await client.GetFromJsonAsync<ProductDto[]>(
            "/api/productos/stock-bajo");
        Assert.NotNull(lowStockProducts);
        Assert.Contains(lowStockProducts, product => product.Id == created.Id);

        var entryResponse = await client.PostAsJsonAsync(
            $"/api/productos/{created.Id}/ajustes-stock",
            new { type = "Entry", quantity = 4, observation = "Compra de reposición" });

        Assert.Equal(HttpStatusCode.OK, entryResponse.StatusCode);
        var adjusted = await entryResponse.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(adjusted);
        Assert.Equal(7, adjusted.Stock);
        Assert.False(adjusted.IsLowStock);

        var deleteResponse = await client.DeleteAsync($"/api/productos/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var missingResponse = await client.GetAsync($"/api/productos/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }
}
