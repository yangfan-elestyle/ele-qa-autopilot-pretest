import { loadServerConfig } from "~/server/config/env";
import type { Route } from "./+types/confluence-parse";

interface ConfluencePageResponse {
  id: string;
  title?: string;
  spaceId?: string;
  body?: { view?: { value: string } };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const pageId = url.searchParams.get("page_id");
  if (!pageId) return Response.json({ error: "Missing page_id parameter" }, { status: 400 });

  const { confluence } = loadServerConfig(context.cloudflare.env);
  if (!confluence.token) return Response.json({ error: "QA_ALTASSIAN_API_KEY is not configured" }, { status: 500 });
  if (!confluence.email) return Response.json({ error: "QA_ALTASSIAN_EMAIL is not configured" }, { status: 500 });

  const headers = {
    Authorization: confluence.authorization,
    "Content-Type": "application/json",
  };
  const apiUrl = `https://elestyle.atlassian.net/wiki/api/v2/pages/${pageId}?body-format=view`;

  try {
    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error fetching Confluence page ${pageId}: ${response.status}`);
      return Response.json(
        {
          error: `Failed to fetch Confluence page: HTTP ${response.status}`,
          details: errorText.slice(0, 4000),
        },
        { status: 400 },
      );
    }
    const data = (await response.json()) as ConfluencePageResponse;
    const htmlContent = data.body?.view?.value;
    if (!htmlContent) {
      return Response.json(
        { error: "Unable to extract HTML content from Confluence API response" },
        { status: 400 },
      );
    }
    return Response.json({
      success: true,
      message: "Confluence page fetched successfully",
      data: {
        html_content: htmlContent,
        page_id: pageId,
        html_content_length: htmlContent.length,
        title: data.title || "",
        space: data.spaceId || "",
      },
    });
  } catch (error: any) {
    console.error(`Error fetching Confluence page ${pageId}:`, error?.message || error);
    return Response.json(
      { error: "Failed to fetch Confluence page", details: error?.message || "Unknown error occurred" },
      { status: 500 },
    );
  }
}
