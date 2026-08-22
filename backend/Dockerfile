FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source

COPY . .
RUN dotnet restore Agaval.Inventory.slnx
RUN dotnet publish src/Agaval.Inventory.Api/Agaval.Inventory.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
COPY --from=build /app/publish .

USER $APP_UID
ENTRYPOINT ["dotnet", "Agaval.Inventory.Api.dll"]
