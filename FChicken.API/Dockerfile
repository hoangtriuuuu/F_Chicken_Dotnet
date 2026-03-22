# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy toan bo project vao /src/FChicken.API
COPY . ./FChicken.API/

WORKDIR /src/FChicken.API
RUN dotnet restore FChicken.API.csproj
RUN dotnet publish FChicken.API.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:${PORT:-5000}
EXPOSE 5000
ENTRYPOINT ["dotnet", "FChicken.API.dll"]
