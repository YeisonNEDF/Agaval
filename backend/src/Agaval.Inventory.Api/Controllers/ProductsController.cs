using Agaval.Inventory.Api.Contracts.Products;
using Agaval.Inventory.Application.Common.Models;
using Agaval.Inventory.Application.Features.Products;
using Agaval.Inventory.Application.Features.Products.AdjustStock;
using Agaval.Inventory.Application.Features.Products.Create;
using Agaval.Inventory.Application.Features.Products.Delete;
using Agaval.Inventory.Application.Features.Products.GetById;
using Agaval.Inventory.Application.Features.Products.GetList;
using Agaval.Inventory.Application.Features.Products.GetLowStock;
using Agaval.Inventory.Application.Features.Products.Update;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Agaval.Inventory.Api.Controllers;

[ApiController]
[Route("api/productos")]
public sealed class ProductsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ProductDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetAll(
        [FromQuery] int? categoriaId,
        [FromQuery] StockFilter stock = StockFilter.All,
        CancellationToken cancellationToken = default)
    {
        var products = await sender
            .Send(new GetProductsQuery(categoriaId, stock), cancellationToken)
            .ConfigureAwait(false);

        return Ok(products);
    }

    [HttpGet("stock-bajo")]
    [ProducesResponseType<IReadOnlyList<ProductDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetLowStock(
        CancellationToken cancellationToken)
    {
        var products = await sender
            .Send(new GetLowStockProductsQuery(), cancellationToken)
            .ConfigureAwait(false);

        return Ok(products);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var product = await sender
            .Send(new GetProductByIdQuery(id), cancellationToken)
            .ConfigureAwait(false);

        return Ok(product);
    }

    [HttpPost]
    [ProducesResponseType<ProductDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProductDto>> Create(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await sender.Send(
                new CreateProductCommand(
                    request.Name,
                    request.Description,
                    request.Price,
                    request.Stock,
                    request.MinimumStock,
                    request.CategoryId),
                cancellationToken)
            .ConfigureAwait(false);

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> Update(
        int id,
        UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await sender.Send(
                new UpdateProductCommand(
                    id,
                    request.Name,
                    request.Description,
                    request.Price,
                    request.Stock,
                    request.MinimumStock,
                    request.CategoryId),
                cancellationToken)
            .ConfigureAwait(false);

        return Ok(product);
    }

    [HttpPost("{id:int}/ajustes-stock")]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> AdjustStock(
        int id,
        AdjustStockRequest request,
        CancellationToken cancellationToken)
    {
        var product = await sender.Send(
                new AdjustProductStockCommand(id, request.Type, request.Quantity, request.Observation),
                cancellationToken)
            .ConfigureAwait(false);

        return Ok(product);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteProductCommand(id), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}
