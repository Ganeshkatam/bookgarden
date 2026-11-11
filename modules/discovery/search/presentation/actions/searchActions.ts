"use server";

import { createSupabaseServerClient } from "@/shared/core/database/server";
import { ApplicationSearchFacade } from "../../application/facades/ApplicationSearchFacade";
import { GetSearchResultsHandler } from "../../application/queries/GetSearchResults/handler";
import { GetAutocompleteSuggestionsHandler } from "../../application/queries/GetAutocompleteSuggestions/handler";
import { GetRecentSearchesHandler } from "../../application/queries/GetRecentSearches/handler";
import { GetTrendingSearchesHandler } from "../../application/queries/GetTrendingSearches/handler";
import { SupabaseSearchReadModel } from "../../infrastructure/read-models/SupabaseSearchReadModel";
import { SearchRequest } from "../../application/dto/SearchRequestDto";
import { SearchAnalyticsHandler } from "../../application/event-handlers/SearchAnalyticsHandler";
import { eventBus } from "@/shared/core/events/EventBus";

async function getFacade() {
  const supabase = await createSupabaseServerClient();
  const readModel = new SupabaseSearchReadModel(supabase);
  const analyticsHandler = new SearchAnalyticsHandler(supabase);

  const facade = new ApplicationSearchFacade(
    new GetSearchResultsHandler(readModel),
    new GetAutocompleteSuggestionsHandler(readModel),
    new GetRecentSearchesHandler(readModel),
    new GetTrendingSearchesHandler(readModel),
    eventBus,
    analyticsHandler,
  );

  return { facade, supabase };
}

export async function searchAction(request: SearchRequest) {
  const { facade, supabase } = await getFacade();
  const userPromise = supabase.auth.getUser();

  return facade.search(request, userPromise);
}

export async function autocompleteAction(query: string) {
  const { facade } = await getFacade();
  return facade.autocomplete(query);
}

export async function getTrendingSearchesAction() {
  const { facade } = await getFacade();
  return facade.trendingSearches();
}

export async function getRecentSearchesAction(): Promise<string[]> {
  const { facade, supabase } = await getFacade();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return facade.recentSearches(user.id);
}

export async function clearRecentSearchesAction(): Promise<{ success: boolean }> {
  // Database search history is retired. Handled client-side via localStorage.
  return { success: true };
}

export async function deleteSearchHistoryItemAction(_query: string): Promise<{ success: boolean }> {
  // Database search history is retired. Handled client-side via localStorage.
  return { success: true };
}
