using Agaval.Inventory.Application.Features.Categories;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Agaval.Inventory.Api.Controllers;

[ApiController]
[Route("api/categorias")]
public sealed class CategoriesController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CategoryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetActive(
        CancellationToken cancellationToken)
    {
        var categories = await sender
            .Send(new GetActiveCategoriesQuery(), cancellationToken)
            .ConfigureAwait(false);

        return Ok(categories);
    }
}
