import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  username: string;
}

interface VerifyResult {
  exists: boolean;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { username }: RequestBody = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ exists: false, error: "Username is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const cleanUsername = username.replace('@', '');
    const bearerToken = Deno.env.get('TWITTER_BEARER_TOKEN');

    if (!bearerToken) {
      console.error('TWITTER_BEARER_TOKEN environment variable is not set');
      return new Response(
        JSON.stringify({
          exists: false,
          error: "Twitter API is not configured. Please set TWITTER_BEARER_TOKEN."
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanUsername}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            exists: false,
            error: 'Username not found on Twitter',
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const errorText = await response.text();
      console.error('Twitter API error:', response.status, errorText);

      return new Response(
        JSON.stringify({
          exists: false,
          error: 'Failed to verify Twitter username',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    const result: VerifyResult = {
      exists: true,
      username: data.data.username,
      displayName: data.data.name,
      profileUrl: `https://twitter.com/${data.data.username}`,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error('Error verifying Twitter username:', error);

    return new Response(
      JSON.stringify({
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});