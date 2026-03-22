using FChicken.API.Data;
using FChicken.API.Middleware;
using FChicken.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => {
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
        o.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddSingleton<MockDb>();
builder.Services.AddSingleton<JwtService>();

builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseMiddleware<JwtMiddleware>();

// Global error handler — luon tra ve JSON, khong bao gio plain text
app.UseExceptionHandler(errApp => errApp.Run(async ctx => {
    ctx.Response.StatusCode  = 500;
    ctx.Response.ContentType = "application/json";
    var feature = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
    var msg = feature?.Error?.Message ?? "Internal server error";
    await ctx.Response.WriteAsync(
        System.Text.Json.JsonSerializer.Serialize(
            new { Success = false, Message = msg, Data = (object?)null }));
}));

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
