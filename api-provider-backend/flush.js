import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: "https://chief-pony-12404.upstash.io",
  token: "ATB0AAIncDJkNjY3NzM1YmJjNGY0ZjQ0OWIyMGU1MTJkNzAwYjMzNnAyMTI0MDQ",
});

await redis.flushall(); // Clears all data
