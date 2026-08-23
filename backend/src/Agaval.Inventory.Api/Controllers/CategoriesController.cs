using Agaval.Inventory.Api.Contracts.Categories;
using Agaval.Inventory.Api.Infrastructure;
using Agaval.Inventory.Application.Features.Categories;
using Agaval.Inventory.Application.Features.Categories.Create;
using Agaval.Inventory.Application.Features.Categories.Delete;
using Agaval.Inventory.Application.Features.Categories.GetById;
using Agaval.Inventory.Application.Features.Categories.GetList;
using Agaval.Inventory.Application.Features.Categories.Update;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Agaval.Inventory.Api.Controllers;

[ApiController]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[Route("api/categorias")]
public sealed class CategoriesController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CategoryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetAll(
        [FromQuery] bool incluirInactivas = false,
        CancellationToken cancellationToken = default)
    {
        var categories = await sender
            .Send(new GetCategoriesQuery(incluirInactivas), cancellationToken)
            .ConfigureAwait(false);

        return Ok(categories);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<CategoryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var category = await sender
            .Send(new GetCategoryByIdQuery(id), cancellationToken)
            .ConfigureAwait(false);

        return Ok(category);
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.InventoryWrite)]
    [ProducesResponseType<CategoryDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryDto>> Create(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var category = await sender
            .Send(new CreateCategoryCommand(request.Name), cancellationToken)
            .ConfigureAwait(false);

        return CreatedAtAction(nameof(GetById), new { id = category.Id }, category);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.InventoryWrite)]
    [ProducesResponseType<CategoryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryDto>> Update(
        int id,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var category = await sender
            .Send(new UpdateCategoryCommand(id, request.Name, request.IsActive), cancellationToken)
            .ConfigureAwait(false);

        return Ok(category);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.InventoryWrite)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteCategoryCommand(id), cancellationToken).ConfigureAwait(false);
        return NoContent();
    }
}
