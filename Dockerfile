FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Railway build context = root repo, Dockerfile nam trong FChicken.API/
# nen tat ca file da duoc copy vao /src roi
COPY . .

# Debug: xem cau truc thu muc
RUN find . -name "*.csproj" | head -20

# cd vao dung folder
RUN dotnet restore FChicken.API/FChicken.API.csproj
RUN dotnet publish FChicken.API/FChicken.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:${PORT:-5000}
EXPOSE 5000
ENTRYPOINT ["dotnet", "FChicken.API.dll"]
