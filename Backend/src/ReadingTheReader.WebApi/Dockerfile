FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj", "src/ReadingTheReader.WebApi/"]
RUN dotnet restore "src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj"
COPY . .
WORKDIR "/src/src/ReadingTheReader.WebApi"
RUN dotnet build "./ReadingTheReader.WebApi.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./ReadingTheReader.WebApi.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ReadingTheReader.WebApi.dll"]
