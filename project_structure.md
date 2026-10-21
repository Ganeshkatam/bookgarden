# Project Structure

```text
tomesphere-app
├── .agents
│   └── AGENTS.md
├── .github
│   └── workflows
│       └── ci.yml
├── .vscode
│   ├── extensions.json
│   └── settings.json
├── app
│   ├── (app)
│   │   ├── book
│   │   │   └── [id]
│   │   │       └── page.tsx
│   │   ├── discover
│   │   │   ├── _components
│   │   │   │   └── DiscoveryPage.tsx
│   │   │   ├── authors
│   │   │   │   └── page.tsx
│   │   │   ├── collections
│   │   │   │   └── page.tsx
│   │   │   ├── featured
│   │   │   │   └── page.tsx
│   │   │   ├── new
│   │   │   │   └── page.tsx
│   │   │   ├── trending
│   │   │   │   ├── page.tsx
│   │   │   │   └── TrendingClient.tsx
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── search
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (public)
│   │   ├── about
│   │   │   └── page.tsx
│   │   ├── contact
│   │   │   └── page.tsx
│   │   ├── cookies
│   │   │   └── page.tsx
│   │   ├── forgot-password
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── login
│   │   │   └── page.tsx
│   │   ├── maintenance
│   │   │   └── page.tsx
│   │   ├── privacy
│   │   │   └── page.tsx
│   │   ├── report
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── reset-password
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── security
│   │   │   └── page.tsx
│   │   ├── signup
│   │   │   └── page.tsx
│   │   ├── support
│   │   │   └── page.tsx
│   │   ├── terms
│   │   │   └── page.tsx
│   │   ├── verify-email
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (reader)
│   │   └── read
│   │       └── [id]
│   │           └── page.tsx
│   ├── (workspace)
│   │   ├── me
│   │   │   ├── account
│   │   │   │   ├── connections
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── notifications
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── preferences
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── profile
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── security
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── storage
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── annotations
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard
│   │   │   │   └── page.tsx
│   │   │   ├── library
│   │   │   │   └── page.tsx
│   │   │   ├── notes
│   │   │   │   └── page.tsx
│   │   │   ├── onboarding
│   │   │   │   └── page.tsx
│   │   │   ├── shelves
│   │   │   │   ├── [id]
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── actions.ts
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api
│   │   ├── announcements
│   │   │   └── route.ts
│   │   ├── cron
│   │   │   └── process-outbox
│   │   │       └── route.ts
│   │   └── reader
│   │       └── books
│   │           └── [bookId]
│   │               └── access
│   │                   └── route.ts
│   ├── auth
│   │   ├── callback
│   │   │   └── route.ts
│   │   └── confirm
│   │       └── page.tsx
│   ├── sitemap
│   │   └── page.tsx
│   ├── error.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── not-found.tsx
│   ├── providers.tsx
│   ├── robots.ts
│   ├── sitemap.ts
│   ├── template.tsx
│   └── theme-init.ts
├── components
│   ├── cookies
│   │   ├── CookieConsentBanner.test.tsx
│   │   ├── CookieConsentBanner.tsx
│   │   └── ManageCookiesButton.tsx
│   └── ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── popover.tsx
│       ├── sheet.tsx
│       └── tooltip.tsx
├── lib
│   ├── actions
│   │   └── action-result.ts
│   ├── hooks
│   ├── toast.tsx
│   └── utils.ts
├── modules
│   ├── analytics
│   │   ├── application
│   │   │   └── event-handlers
│   │   │       └── AnalyticsEventHandlers.ts
│   │   ├── infrastructure
│   │   │   ├── SupabaseAnalyticsProjectionStore.test.ts
│   │   │   └── SupabaseAnalyticsProjectionStore.ts
│   │   └── AnalyticsModule.ts
│   ├── announcements
│   │   ├── application
│   │   │   ├── commands
│   │   │   │   ├── AnnouncementCommandsAuth.test.ts
│   │   │   │   ├── CreateAnnouncementCommand.ts
│   │   │   │   ├── DeleteAnnouncementCommand.ts
│   │   │   │   └── UpdateAnnouncementCommand.ts
│   │   │   ├── dto
│   │   │   │   └── AnnouncementDto.ts
│   │   │   ├── ports
│   │   │   │   └── read-models
│   │   │   │       └── AnnouncementReadModel.ts
│   │   │   └── queries
│   │   │       └── GetActiveAnnouncements
│   │   │           └── handler.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── Announcement.ts
│   │   │   └── repositories
│   │   │       └── AnnouncementRepository.ts
│   │   ├── infrastructure
│   │   │   ├── read-models
│   │   │   │   └── SupabaseAnnouncementReadModel.ts
│   │   │   ├── repositories
│   │   │   └── SupabaseAnnouncementRepository.ts
│   │   └── presentation
│   │       ├── actions
│   │       │   └── announcements.ts
│   │       ├── components
│   │       │   ├── AnnouncementBanner.tsx
│   │       │   ├── AnnouncementCenter.test.tsx
│   │       │   ├── AnnouncementCenter.tsx
│   │       │   ├── AnnouncementNotice.test.tsx
│   │       │   ├── AnnouncementNotice.tsx
│   │       │   └── MaintenanceDocumentViewer.tsx
│   │       └── utils
│   │           ├── announcement-storage.test.ts
│   │           └── announcement-storage.ts
│   ├── authentication
│   │   ├── presentation
│   │   │   ├── actions
│   │   │   │   └── auth.ts
│   │   │   ├── components
│   │   │   │   ├── AuthTopBar.tsx
│   │   │   │   ├── LoginClient.tsx
│   │   │   │   ├── MFASetup.tsx
│   │   │   │   ├── OnboardingTour.tsx
│   │   │   │   ├── PhoneAuth.tsx
│   │   │   │   ├── PhoneInput.tsx
│   │   │   │   ├── SignupClient.tsx
│   │   │   │   ├── VerificationStatus.tsx
│   │   │   │   ├── VerifyPasswordClient.tsx
│   │   │   │   └── WelcomeTour.tsx
│   │   │   └── screens
│   │   │       ├── LoginScreen.tsx
│   │   │       └── SignupScreen.tsx
│   │   ├── services
│   │   │   └── email-validation.ts
│   │   └── types
│   ├── authorization
│   │   ├── application
│   │   │   ├── PermissionService.test.ts
│   │   │   └── PermissionService.ts
│   │   ├── domain
│   │   │   ├── errors
│   │   │   │   └── AuthorizationInfrastructureError.ts
│   │   │   └── AuthorizationRepository.ts
│   │   └── infrastructure
│   │       ├── SupabaseAuthorizationRepository.test.ts
│   │       └── SupabaseAuthorizationRepository.ts
│   ├── authors
│   │   ├── application
│   │   │   └── commands
│   │   │       ├── CreateAuthorCommand.ts
│   │   │       ├── DeleteAuthorCommand.ts
│   │   │       ├── index.ts
│   │   │       └── UpdateAuthorCommand.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── Author.ts
│   │   │   └── repositories
│   │   │       └── AuthorRepository.ts
│   │   └── infrastructure
│   │       └── SupabaseAuthorRepository.ts
│   ├── books
│   │   ├── application
│   │   │   ├── commands
│   │   │   │   ├── ArchiveBookCommand.ts
│   │   │   │   ├── ChangeBookLanguageCommand.ts
│   │   │   │   ├── CreateBookCommand.ts
│   │   │   │   ├── DeferredCommands.test.ts
│   │   │   │   ├── DeleteBookFileCommand.ts
│   │   │   │   ├── IncrementBookViewCountCommand.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── PublishBookCommand.ts
│   │   │   │   ├── ReplaceBookFilesCommand.ts
│   │   │   │   ├── RestoreBookCommand.ts
│   │   │   │   ├── UpdateBookCommand.ts
│   │   │   │   └── UploadBookFileCommand.ts
│   │   │   ├── facades
│   │   │   │   ├── BookPageFacade.ts
│   │   │   │   └── index.ts
│   │   │   ├── queries
│   │   │   │   ├── GetBook
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   └── query.ts
│   │   │   │   ├── GetBookDetail
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── GetBooksByAuthor
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── GetBookViewerContext
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── GetRelatedBooks
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── GetTrendingBooks
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── ResolveBookDownloadResource
│   │   │   │   └── SearchBooks
│   │   │   │       ├── handler.ts
│   │   │   │       └── query.ts
│   │   │   └── types.ts
│   │   ├── components
│   │   │   ├── AddToShelfButton.test.tsx
│   │   │   ├── AddToShelfButton.tsx
│   │   │   ├── BookCard.test.tsx
│   │   │   ├── BookCard.tsx
│   │   │   ├── BookDetailActions.tsx
│   │   │   ├── BookDetailHero.test.tsx
│   │   │   ├── BookDetailHero.tsx
│   │   │   ├── DefaultBookCover.tsx
│   │   │   ├── ExploreClient.tsx
│   │   │   ├── RandomBookButton.tsx
│   │   │   └── RecentlyViewed.tsx
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── Book.ts
│   │   │   ├── events
│   │   │   │   └── BookEvents.ts
│   │   │   ├── repositories
│   │   │   │   ├── ports
│   │   │   │   │   └── BookRepositoryContract.ts
│   │   │   │   ├── BookFileRepository.ts
│   │   │   │   └── BookRepository.ts
│   │   │   └── value-objects
│   │   │       ├── BookFile.ts
│   │   │       └── index.ts
│   │   ├── infrastructure
│   │   │   ├── mappers
│   │   │   │   ├── BookFileMapper.ts
│   │   │   │   ├── BookMapper.test.ts
│   │   │   │   └── BookMapper.ts
│   │   │   ├── models
│   │   │   │   └── BookRow.ts
│   │   │   ├── read-models
│   │   │   │   └── BookReadModel.ts
│   │   │   ├── SupabaseBookFileRepository.ts
│   │   │   └── SupabaseBookRepository.ts
│   │   ├── presentation
│   │   │   ├── actions
│   │   │   │   ├── get-book.ts
│   │   │   │   └── trending.ts
│   │   │   └── screens
│   │   │       └── ExploreScreen.tsx
│   │   ├── services
│   │   │   └── random-book.ts
│   │   └── types
│   │       └── genres.ts
│   ├── collections
│   │   ├── application
│   │   │   └── commands
│   │   │       ├── CreateCollectionCommand.ts
│   │   │       ├── DeleteCollectionCommand.ts
│   │   │       ├── index.ts
│   │   │       ├── UpdateCollectionBooksCommand.ts
│   │   │       └── UpdateCollectionCommand.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── Collection.ts
│   │   │   └── repositories
│   │   │       └── CollectionRepository.ts
│   │   └── infrastructure
│   │       └── SupabaseCollectionRepository.ts
│   ├── dashboard
│   │   ├── application
│   │   │   ├── dto
│   │   │   │   └── DashboardPageDto.ts
│   │   │   ├── facades
│   │   │   │   └── DashboardPageFacade.ts
│   │   │   └── queries
│   │   │       └── GetDashboardAnalytics
│   │   │           └── handler.ts
│   │   ├── presentation
│   │   │   ├── actions
│   │   │   │   ├── goals.test.ts
│   │   │   │   └── goals.ts
│   │   │   └── components
│   │   │       ├── DashboardActiveShelf.tsx
│   │   │       ├── DashboardClient.tsx
│   │   │       ├── DashboardGoalsCard.tsx
│   │   │       ├── DashboardMetrics.tsx
│   │   │       ├── DashboardMilestones.tsx
│   │   │       ├── DashboardTimeline.tsx
│   │   │       ├── DashboardVelocityChart.tsx
│   │   │       └── ReadingGoalModal.tsx
│   │   └── ReadingGoalsFactBasedIntegration.test.ts
│   ├── discovery
│   │   ├── application
│   │   │   ├── dto
│   │   │   │   ├── AuthorCardDto.ts
│   │   │   │   ├── BookSummaryDto.ts
│   │   │   │   └── CollectionSummaryDto.ts
│   │   │   ├── facades
│   │   │   │   ├── DiscoveryFacade.ts
│   │   │   │   └── index.ts
│   │   │   ├── mappers
│   │   │   │   ├── BookSummaryMapper.test.ts
│   │   │   │   └── BookSummaryMapper.ts
│   │   │   ├── ports
│   │   │   │   └── read-models
│   │   │   │       └── DiscoveryReadModel.ts
│   │   │   ├── queries
│   │   │   │   ├── GetAuthors
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── response.ts
│   │   │   │   ├── GetCollections
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── response.ts
│   │   │   │   ├── GetDiscoveryOverview
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── read-model.ts
│   │   │   │   ├── GetFeaturedBooks
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── response.ts
│   │   │   │   ├── GetGenres
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── response.ts
│   │   │   │   ├── GetLanguages
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── response.ts
│   │   │   │   ├── GetNewArrivals
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── response.ts
│   │   │   │   ├── GetSearchSuggestions
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── GetSubjects
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── response.ts
│   │   │   │   ├── GetSuggestedReadsQuery
│   │   │   │   │   ├── dto.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── GetTrendingBooks
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── response.ts
│   │   │   │   └── SearchBooks
│   │   │   │       ├── handler.ts
│   │   │   │       └── read-model.ts
│   │   │   └── repositories
│   │   ├── infrastructure
│   │   │   ├── read-models
│   │   │   │   ├── SupabaseDiscoveryReadModel.ts
│   │   │   │   └── SupabaseSuggestedReadsReadModel.ts
│   │   │   └── repositories
│   │   ├── presentation
│   │   │   ├── actions
│   │   │   │   └── discovery.ts
│   │   │   ├── components
│   │   │   │   ├── AuthorCard.tsx
│   │   │   │   ├── AuthorGrid.tsx
│   │   │   │   ├── BookCard.tsx
│   │   │   │   ├── BookCarousel.test.tsx
│   │   │   │   ├── BookCarousel.tsx
│   │   │   │   ├── BookGrid.tsx
│   │   │   │   ├── CollectionCard.tsx
│   │   │   │   ├── CollectionGrid.tsx
│   │   │   │   ├── CuratedSections.tsx
│   │   │   │   ├── DiscoverPlatformFeatures.tsx
│   │   │   │   ├── DiscoverThemeHub.tsx
│   │   │   │   ├── DiscoveryHero.tsx
│   │   │   │   ├── DiscoverySearch.test.tsx
│   │   │   │   ├── DiscoverySearch.tsx
│   │   │   │   ├── DiscoverySection.tsx
│   │   │   │   ├── DiscoverySidebar.tsx
│   │   │   │   ├── FeaturedBooks.tsx
│   │   │   │   ├── GenreBrowser.tsx
│   │   │   │   ├── GenreCard.tsx
│   │   │   │   ├── GenreGrid.tsx
│   │   │   │   ├── LanguageCard.tsx
│   │   │   │   ├── LanguageGrid.tsx
│   │   │   │   ├── SubjectCard.tsx
│   │   │   │   └── SubjectGrid.tsx
│   │   │   ├── factories
│   │   │   │   ├── getDiscoveryConfiguration.test.tsx
│   │   │   │   └── getDiscoveryConfiguration.tsx
│   │   │   └── types
│   │   │       └── DiscoveryConfiguration.ts
│   │   ├── recommendations
│   │   │   ├── application
│   │   │   │   ├── event-handlers
│   │   │   │   │   ├── RecommendationHandlers.ts
│   │   │   │   │   ├── RecommendationSignalEventHandlers.test.ts
│   │   │   │   │   └── RecommendationSignalEventHandlers.ts
│   │   │   │   ├── pipeline
│   │   │   │   │   ├── CandidateRetriever.ts
│   │   │   │   │   ├── RecommendationPipeline.test.ts
│   │   │   │   │   ├── RecommendationPipeline.ts
│   │   │   │   │   ├── RecommendationPipelineStage.ts
│   │   │   │   │   └── RecommendationPlan.ts
│   │   │   │   ├── projections
│   │   │   │   │   └── RecommendationContextStore.ts
│   │   │   │   ├── providers
│   │   │   │   │   ├── CandidateProvider.ts
│   │   │   │   │   └── RecommendationContextProvider.ts
│   │   │   │   ├── queries
│   │   │   │   │   ├── GetPersonalizedRecommendations
│   │   │   │   │   │   ├── handler.test.ts
│   │   │   │   │   │   ├── handler.ts
│   │   │   │   │   │   └── query.ts
│   │   │   │   │   └── read-models
│   │   │   │   │       └── RecommendationReadModel.ts
│   │   │   │   └── services
│   │   │   │       └── RecommendationExplanationService.ts
│   │   │   ├── domain
│   │   │   │   ├── policies
│   │   │   │   │   ├── CandidateFilter.ts
│   │   │   │   │   ├── CandidateFilterPolicy.ts
│   │   │   │   │   ├── CompositeCandidateFilter.ts
│   │   │   │   │   ├── CompositeDiversificationPolicy.ts
│   │   │   │   │   ├── DiversificationPolicy.ts
│   │   │   │   │   ├── LanguageFilter.ts
│   │   │   │   │   ├── OwnershipFilter.ts
│   │   │   │   │   └── SimpleAuthorDiversificationPolicy.ts
│   │   │   │   ├── repositories
│   │   │   │   │   └── SignalRepository.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── CategoryAffinityScorer.ts
│   │   │   │   │   ├── PopularityScorer.ts
│   │   │   │   │   ├── RecommendationScorer.ts
│   │   │   │   │   ├── RecommendationStrategy.ts
│   │   │   │   │   ├── SignalAffinityScorer.ts
│   │   │   │   │   ├── WeightedHybridStrategy.test.ts
│   │   │   │   │   └── WeightedHybridStrategy.ts
│   │   │   │   └── value-objects
│   │   │   │       ├── BookFeature.ts
│   │   │   │       ├── RecommendationCandidate.ts
│   │   │   │       ├── RecommendationContext.ts
│   │   │   │       ├── RecommendationReason.ts
│   │   │   │       ├── RecommendationScenario.ts
│   │   │   │       ├── RecommendationSource.ts
│   │   │   │       └── UserInteractionFact.ts
│   │   │   ├── infrastructure
│   │   │   │   ├── SearchCandidateProvider.ts
│   │   │   │   ├── SupabaseSignalRepository.ts
│   │   │   │   └── UserRecommendationContextProvider.ts
│   │   │   └── RecommendationModule.ts
│   │   └── search
│   │       ├── actions
│   │       ├── application
│   │       │   ├── commands
│   │       │   │   ├── IndexBook
│   │       │   │   │   ├── command.ts
│   │       │   │   │   ├── handler.ts
│   │       │   │   │   ├── input.ts
│   │       │   │   │   └── output.ts
│   │       │   │   ├── RemoveIndexedBook
│   │       │   │   │   ├── command.ts
│   │       │   │   │   ├── handler.ts
│   │       │   │   │   ├── input.ts
│   │       │   │   │   └── output.ts
│   │       │   │   └── UpdateIndexedBook
│   │       │   │       ├── command.ts
│   │       │   │       ├── handler.ts
│   │       │   │       ├── input.ts
│   │       │   │       └── output.ts
│   │       │   ├── dto
│   │       │   │   ├── SearchFacetDto.ts
│   │       │   │   ├── SearchPaginationDto.ts
│   │       │   │   ├── SearchRequestDto.ts
│   │       │   │   ├── SearchResultDto.ts
│   │       │   │   └── SearchSuggestionDto.ts
│   │       │   ├── event-handlers
│   │       │   │   ├── EventDrivenFlow.test.ts
│   │       │   │   ├── index.ts
│   │       │   │   ├── SearchAnalyticsHandler.ts
│   │       │   │   ├── SearchDocumentEventHandlers.ts
│   │       │   │   └── SearchHandlers.ts
│   │       │   ├── facades
│   │       │   │   ├── ApplicationSearchFacade.ts
│   │       │   │   └── SearchFacade.ts
│   │       │   ├── projections
│   │       │   │   └── SearchIndexProjectionBuilder.ts
│   │       │   ├── queries
│   │       │   │   ├── GetAutocompleteSuggestions
│   │       │   │   │   ├── handler.test.ts
│   │       │   │   │   ├── handler.ts
│   │       │   │   │   └── query.ts
│   │       │   │   ├── GetRecentSearches
│   │       │   │   │   ├── handler.ts
│   │       │   │   │   └── query.ts
│   │       │   │   ├── GetSearchResults
│   │       │   │   │   ├── handler.ts
│   │       │   │   │   └── query.ts
│   │       │   │   ├── GetTrendingSearches
│   │       │   │   │   ├── handler.test.ts
│   │       │   │   │   ├── handler.ts
│   │       │   │   │   └── query.ts
│   │       │   │   └── SearchBooks
│   │       │   │       ├── handler.ts
│   │       │   │       ├── query.ts
│   │       │   │       └── read-model.ts
│   │       │   └── ranking
│   │       │       ├── PostgresRankingStrategy.ts
│   │       │       └── SearchRankingStrategy.ts
│   │       ├── domain
│   │       │   ├── policies
│   │       │   │   └── RankingPolicy.ts
│   │       │   ├── repositories
│   │       │   │   └── SearchRepository.ts
│   │       │   └── value-objects
│   │       │       └── SearchQuery.ts
│   │       ├── infrastructure
│   │       │   ├── models
│   │       │   │   └── BookSearchDocument.ts
│   │       │   ├── projections
│   │       │   │   └── SearchIndexer.ts
│   │       │   ├── read-models
│   │       │   │   └── SupabaseSearchReadModel.ts
│   │       │   └── repositories
│   │       │       ├── ports
│   │       │       │   ├── InMemorySearchRepository.ts
│   │       │       │   └── SearchBehavior.test.ts
│   │       │       └── SearchProjectionRepository.ts
│   │       ├── presentation
│   │       │   ├── actions
│   │       │   │   ├── search.ts
│   │       │   │   ├── searchActions.test.ts
│   │       │   │   └── searchActions.ts
│   │       │   ├── components
│   │       │   │   ├── CommandPalette.tsx
│   │       │   │   ├── GlobalSearchInput.tsx
│   │       │   │   ├── SearchBar.tsx
│   │       │   │   ├── SearchClient.tsx
│   │       │   │   ├── SearchFacetSidebar.test.tsx
│   │       │   │   ├── SearchFacetSidebar.tsx
│   │       │   │   ├── SearchSuggestions.tsx
│   │       │   │   └── VoiceInput.tsx
│   │       │   └── screens
│   │       │       └── SearchScreen.tsx
│   │       ├── services
│   │       │   └── input-detection.ts
│   │       ├── types
│   │       └── SearchModule.ts
│   ├── featured_books
│   │   ├── application
│   │   │   └── commands
│   │   │       ├── index.ts
│   │   │       └── UpdateFeaturedBooksCommand.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── FeaturedBook.ts
│   │   │   └── repositories
│   │   │       └── FeaturedBookRepository.ts
│   │   └── infrastructure
│   │       └── SupabaseFeaturedBookRepository.ts
│   ├── genres
│   │   ├── application
│   │   │   └── commands
│   │   │       ├── CreateGenreCommand.ts
│   │   │       ├── DeleteGenreCommand.ts
│   │   │       ├── index.ts
│   │   │       └── UpdateGenreCommand.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── Genre.ts
│   │   │   └── repositories
│   │   │       └── GenreRepository.ts
│   │   └── infrastructure
│   │       └── SupabaseGenreRepository.ts
│   ├── home
│   │   ├── actions
│   │   ├── application
│   │   │   └── facades
│   │   │       ├── HomePageFacade.ts
│   │   │       └── index.ts
│   │   ├── presentation
│   │   │   ├── components
│   │   │   │   ├── ActivityWidget.tsx
│   │   │   │   ├── ContinueReadingWidget.tsx
│   │   │   │   ├── CurrentReadingWidget.tsx
│   │   │   │   ├── GoalWidget.tsx
│   │   │   │   ├── HomeClient.tsx
│   │   │   │   ├── LibraryWidget.tsx
│   │   │   │   ├── QuickActionsWidget.tsx
│   │   │   │   ├── ReadingCalendarWidget.tsx
│   │   │   │   ├── StatisticsWidget.tsx
│   │   │   │   ├── StreakWidget.tsx
│   │   │   │   ├── SuggestedReadsWidget.tsx
│   │   │   │   └── WelcomeWidget.tsx
│   │   │   └── screens
│   │   ├── services
│   │   └── types
│   ├── landing
│   │   ├── actions
│   │   ├── application
│   │   │   └── facades
│   │   │       ├── index.ts
│   │   │       └── LandingPageFacade.ts
│   │   ├── presentation
│   │   │   └── components
│   │   │       ├── AnnouncementSection.test.tsx
│   │   │       ├── AnnouncementSection.tsx
│   │   │       ├── BookShelfRow.tsx
│   │   │       ├── CatalogHero.tsx
│   │   │       ├── ClassicsBooksSection.tsx
│   │   │       ├── FeaturedBooksSection.tsx
│   │   │       ├── FeaturedCollectionsSection.tsx
│   │   │       ├── FeaturedItemCard.tsx
│   │   │       ├── GenreBrowserSection.tsx
│   │   │       ├── HeroSection.tsx
│   │   │       ├── LandingClient.tsx
│   │   │       ├── PhilosophyBooksSection.tsx
│   │   │       ├── PopularAuthorsSection.tsx
│   │   │       ├── RecentlyAddedSection.tsx
│   │   │       ├── ScienceBooksSection.tsx
│   │   │       ├── SlowScrollBooksSection.tsx
│   │   │       ├── StatisticsSection.tsx
│   │   │       ├── SubjectsExplorerSection.tsx
│   │   │       ├── TrendingBooksSection.tsx
│   │   │       └── ViewAllCard.tsx
│   │   └── types
│   ├── languages
│   │   ├── application
│   │   │   └── commands
│   │   │       ├── CreateLanguageCommand.ts
│   │   │       ├── DeleteLanguageCommand.ts
│   │   │       ├── index.ts
│   │   │       └── UpdateLanguageCommand.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── Language.ts
│   │   │   └── repositories
│   │   │       └── LanguageRepository.ts
│   │   └── infrastructure
│   │       └── SupabaseLanguageRepository.ts
│   ├── library
│   │   ├── application
│   │   │   ├── commands
│   │   │   │   ├── AddBookToCollection
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── AddBookToLibrary
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   └── input.ts
│   │   │   │   ├── ChangeReadingState
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   └── input.ts
│   │   │   │   ├── CreateCollection
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── DeleteCollection
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── MoveBookToCollection
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── RemoveBookFromCollection
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── RemoveBookFromLibrary
│   │   │   │   │   └── handler.ts
│   │   │   │   ├── UpdateCollection
│   │   │   │   │   └── handler.ts
│   │   │   │   └── UpdateReadingProgress
│   │   │   │       ├── handler.ts
│   │   │   │       └── input.ts
│   │   │   ├── dto
│   │   │   │   └── response
│   │   │   │       ├── BookDetailDto.ts
│   │   │   │       ├── BookDto.ts
│   │   │   │       ├── CollectionDto.ts
│   │   │   │       ├── LibraryBookDto.ts
│   │   │   │       ├── LibraryEntryDto.ts
│   │   │   │       ├── LibraryPageDto.ts
│   │   │   │       └── ShelvesPageDto.ts
│   │   │   ├── facades
│   │   │   │   ├── index.ts
│   │   │   │   ├── LibraryPageFacade.ts
│   │   │   │   └── ShelvesPageFacade.ts
│   │   │   ├── mappers
│   │   │   │   ├── BookMapper.ts
│   │   │   │   └── LibraryMapper.ts
│   │   │   ├── ports
│   │   │   │   └── read-models
│   │   │   │       └── LibraryReadModel.ts
│   │   │   ├── projections
│   │   │   │   └── CanonicalBookProgressProjection.ts
│   │   │   └── queries
│   │   │       ├── GetAllLibraryBooks
│   │   │       │   └── handler.ts
│   │   │       ├── GetCollection
│   │   │       │   └── handler.ts
│   │   │       ├── GetCollections
│   │   │       │   └── handler.ts
│   │   │       ├── GetContinueReadingQuery
│   │   │       │   ├── dto.ts
│   │   │       │   └── index.ts
│   │   │       ├── GetCurrentlyReading
│   │   │       │   └── handler.ts
│   │   │       ├── GetCurrentReadingQuery
│   │   │       │   ├── dto.ts
│   │   │       │   └── index.ts
│   │   │       ├── GetFinishedBooks
│   │   │       │   └── handler.ts
│   │   │       ├── GetLibraryBooks
│   │   │       │   └── handler.ts
│   │   │       ├── GetLibraryFilters
│   │   │       │   └── handler.ts
│   │   │       ├── GetLibraryNavigation
│   │   │       │   └── handler.ts
│   │   │       ├── GetLibrarySnapshotQuery
│   │   │       │   ├── dto.ts
│   │   │       │   └── index.ts
│   │   │       ├── GetLibrarySummary
│   │   │       │   └── handler.ts
│   │   │       ├── GetShelvesPage
│   │   │       │   └── handler.ts
│   │   │       └── GetWantToRead
│   │   │           └── handler.ts
│   │   ├── components
│   │   │   ├── LibraryClient.test.tsx
│   │   │   ├── LibraryClient.tsx
│   │   │   ├── LibraryContextMenu.tsx
│   │   │   ├── LibraryGrid.tsx
│   │   │   ├── LibraryList.test.tsx
│   │   │   ├── LibraryList.tsx
│   │   │   ├── LibraryOverview.tsx
│   │   │   ├── LibraryToolbar.test.tsx
│   │   │   ├── LibraryToolbar.tsx
│   │   │   ├── ShelfCard.test.tsx
│   │   │   ├── ShelfCard.tsx
│   │   │   ├── ShelfDetailClient.test.tsx
│   │   │   ├── ShelfDetailClient.tsx
│   │   │   ├── ShelvesClient.test.tsx
│   │   │   └── ShelvesClient.tsx
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── LibraryBook.ts
│   │   │   ├── errors
│   │   │   │   └── index.ts
│   │   │   ├── events
│   │   │   │   ├── index.ts
│   │   │   │   └── LibraryEvents.ts
│   │   │   ├── models
│   │   │   │   └── Collection.ts
│   │   │   ├── repositories
│   │   │   │   ├── ports
│   │   │   │   │   └── LibraryRepositoryContract.ts
│   │   │   │   ├── CollectionRepository.ts
│   │   │   │   ├── LibraryRepository.ts
│   │   │   │   └── LibraryWriteRepository.ts
│   │   │   └── value-objects
│   │   │       └── index.ts
│   │   ├── infrastructure
│   │   │   ├── mappers
│   │   │   │   └── LibraryMapper.ts
│   │   │   ├── read-models
│   │   │   │   ├── SupabaseContinueReadingReadModel.ts
│   │   │   │   ├── SupabaseCurrentReadingReadModel.ts
│   │   │   │   ├── SupabaseLibraryReadModel.ts
│   │   │   │   └── SupabaseLibrarySnapshotReadModel.ts
│   │   │   ├── repositories
│   │   │   │   ├── SupabaseCollectionRepository.ts
│   │   │   │   └── SupabaseLibraryWriteRepository.ts
│   │   │   └── SupabaseLibraryRepository.ts
│   │   ├── presentation
│   │   │   ├── actions
│   │   │   │   └── library.ts
│   │   │   └── screens
│   │   │       └── LibraryScreen.tsx
│   │   ├── services
│   │   ├── store
│   │   │   └── library-store.ts
│   │   └── types
│   ├── me
│   │   ├── account
│   │   │   ├── application
│   │   │   │   ├── dto
│   │   │   │   ├── facades
│   │   │   │   │   ├── AccountDashboardFacade.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ports
│   │   │   │   │   └── read-models
│   │   │   │   │       └── DashboardReadModel.ts
│   │   │   │   └── queries
│   │   │   │       ├── GetDashboardOverview
│   │   │   │       │   ├── handler.ts
│   │   │   │       │   └── read-model.ts
│   │   │   │       └── GetRecentActivityQuery
│   │   │   │           ├── dto.ts
│   │   │   │           └── index.ts
│   │   │   ├── connections
│   │   │   │   └── presentation
│   │   │   │       └── components
│   │   │   │           └── ConnectedAccountsScreen.tsx
│   │   │   ├── deletion
│   │   │   │   ├── application
│   │   │   │   │   ├── commands
│   │   │   │   │   │   └── DeleteAccount
│   │   │   │   │   │       ├── handler.ts
│   │   │   │   │   │       └── index.ts
│   │   │   │   │   └── validators
│   │   │   │   │       └── deleteAccountSchema.ts
│   │   │   │   ├── domain
│   │   │   │   │   └── repositories
│   │   │   │   │       └── AccountDeletionRepository.ts
│   │   │   │   └── infrastructure
│   │   │   │       └── repositories
│   │   │   │           └── SupabaseAccountDeletionRepository.ts
│   │   │   ├── infrastructure
│   │   │   │   ├── read-models
│   │   │   │   │   ├── SupabaseDashboardReadModel.ts
│   │   │   │   │   └── SupabaseRecentActivityReadModel.ts
│   │   │   │   └── repositories
│   │   │   ├── notifications
│   │   │   │   ├── domain
│   │   │   │   │   ├── entities
│   │   │   │   │   │   └── NotificationPreferences.ts
│   │   │   │   │   └── repositories
│   │   │   │   │       └── NotificationPreferencesRepository.ts
│   │   │   │   ├── infrastructure
│   │   │   │   │   └── repositories
│   │   │   │   │       └── SupabaseNotificationPreferencesRepository.ts
│   │   │   │   └── presentation
│   │   │   │       ├── actions
│   │   │   │       │   ├── notifications.test.ts
│   │   │   │       │   └── notifications.ts
│   │   │   │       └── components
│   │   │   │           └── NotificationsForm.tsx
│   │   │   ├── preferences
│   │   │   │   ├── application
│   │   │   │   │   ├── commands
│   │   │   │   │   │   └── UpdatePreferences
│   │   │   │   │   │       ├── handler.ts
│   │   │   │   │   │       └── index.ts
│   │   │   │   │   ├── dto
│   │   │   │   │   │   └── PreferencesPageDto.ts
│   │   │   │   │   ├── facades
│   │   │   │   │   │   └── PreferencesPageFacade.ts
│   │   │   │   │   ├── ports
│   │   │   │   │   │   └── ReaderPreferencesPort.ts
│   │   │   │   │   ├── queries
│   │   │   │   │   │   └── GetPreferences
│   │   │   │   │   │       └── index.ts
│   │   │   │   │   └── validators
│   │   │   │   │       └── updatePreferencesSchema.ts
│   │   │   │   ├── domain
│   │   │   │   │   ├── entities
│   │   │   │   │   │   └── UserPreferences.ts
│   │   │   │   │   └── repositories
│   │   │   │   │       └── PreferencesRepository.ts
│   │   │   │   ├── infrastructure
│   │   │   │   │   ├── read-models
│   │   │   │   │   │   └── SupabasePreferencesReadModel.ts
│   │   │   │   │   └── repositories
│   │   │   │   │       └── SupabasePreferencesRepository.ts
│   │   │   │   └── presentation
│   │   │   │       ├── actions
│   │   │   │       │   └── preferences.ts
│   │   │   │       └── components
│   │   │   │           └── PreferencesForm.tsx
│   │   │   ├── presentation
│   │   │   │   ├── actions
│   │   │   │   │   └── profile.ts
│   │   │   │   ├── components
│   │   │   │   │   ├── AccountLayoutShell.tsx
│   │   │   │   │   ├── AccountSidebar.tsx
│   │   │   │   │   └── TodayLayoutShell.tsx
│   │   │   │   ├── hooks
│   │   │   │   ├── screens
│   │   │   │   │   ├── CollectionsScreen.tsx
│   │   │   │   │   ├── InboxScreen.tsx
│   │   │   │   │   ├── PreferencesScreen.tsx
│   │   │   │   │   ├── ReadingScreen.tsx
│   │   │   │   │   └── TodayScreen.tsx
│   │   │   │   └── navigation.ts
│   │   │   ├── profile
│   │   │   │   ├── domain
│   │   │   │   │   ├── entities
│   │   │   │   │   │   └── Profile.ts
│   │   │   │   │   └── repositories
│   │   │   │   │       └── ProfileRepository.ts
│   │   │   │   ├── infrastructure
│   │   │   │   │   └── repositories
│   │   │   │   │       └── SupabaseProfileRepository.ts
│   │   │   │   └── presentation
│   │   │   │       ├── actions
│   │   │   │       │   └── profile.ts
│   │   │   │       └── components
│   │   │   │           └── ProfileForm.tsx
│   │   │   ├── security
│   │   │   │   ├── application
│   │   │   │   │   ├── commands
│   │   │   │   │   │   ├── ChangePassword
│   │   │   │   │   │   │   ├── handler.ts
│   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   └── SignOutEverywhere
│   │   │   │   │   │       ├── handler.ts
│   │   │   │   │   │       └── index.ts
│   │   │   │   │   ├── dto
│   │   │   │   │   │   └── SecurityPageDto.ts
│   │   │   │   │   ├── facades
│   │   │   │   │   │   └── SecurityPageFacade.ts
│   │   │   │   │   ├── ports
│   │   │   │   │   │   └── SecurityReadModel.ts
│   │   │   │   │   └── validators
│   │   │   │   │       └── changePasswordSchema.ts
│   │   │   │   ├── domain
│   │   │   │   │   └── repositories
│   │   │   │   │       └── SecurityRepository.ts
│   │   │   │   ├── infrastructure
│   │   │   │   │   ├── read-models
│   │   │   │   │   │   └── SupabaseSecurityReadModel.ts
│   │   │   │   │   └── repositories
│   │   │   │   │       └── SupabaseSecurityRepository.ts
│   │   │   │   └── presentation
│   │   │   │       ├── actions
│   │   │   │       │   └── security.ts
│   │   │   │       └── components
│   │   │   │           ├── DangerZone.tsx
│   │   │   │           ├── PasswordSection.tsx
│   │   │   │           ├── SecurityForm.tsx
│   │   │   │           ├── SecurityScreen.tsx
│   │   │   │           └── SignOutSection.tsx
│   │   │   └── storage
│   │   │       └── presentation
│   │   │           └── components
│   │   │               └── StorageSettingsScreen.tsx
│   │   ├── application
│   │   │   ├── facades
│   │   │   │   ├── index.ts
│   │   │   │   └── MePageFacade.ts
│   │   │   ├── queries
│   │   │   │   └── GetUserStatisticsQuery.ts
│   │   │   └── repositories
│   │   ├── infrastructure
│   │   │   └── supabase
│   │   │       └── SupabaseUserStatisticsReadModel.ts
│   │   └── presentation
│   │       └── components
│   │           ├── MeClient.tsx
│   │           ├── MeHeroSection.tsx
│   │           └── UserStatisticsWidget.tsx
│   ├── notifications
│   │   ├── application
│   │   │   └── event-handlers
│   │   │       └── NotificationEventHandlers.ts
│   │   ├── domain
│   │   │   ├── repositories
│   │   │   │   ├── INotificationPreferencesRepository.ts
│   │   │   │   └── INotificationRepository.ts
│   │   │   └── Notification.ts
│   │   ├── infrastructure
│   │   │   ├── SupabaseNotificationRepository.test.ts
│   │   │   └── SupabaseNotificationRepository.ts
│   │   ├── presentation
│   │   │   ├── actions
│   │   │   │   └── notifications.ts
│   │   │   └── components
│   │   │       └── NotificationBell.tsx
│   │   ├── NotificationPreferencesFiltering.test.ts
│   │   ├── NotificationsModule.ts
│   │   └── NotificationVerticalSlice.test.ts
│   ├── orchestration
│   │   └── ReadingActivityCoordinator.ts
│   ├── progress
│   │   ├── analytics
│   │   │   ├── components
│   │   │   │   ├── ReadingGoalProgress.tsx
│   │   │   │   └── ReadingStreak.tsx
│   │   │   ├── services
│   │   │   │   └── view-history.ts
│   │   │   └── types
│   │   ├── application
│   │   │   ├── commands
│   │   │   │   ├── ApplyReadingActivity
│   │   │   │   │   └── handler.ts
│   │   │   │   └── UpdateReadingGoalCommand.ts
│   │   │   ├── dto
│   │   │   │   └── response
│   │   │   │       ├── ReadingGoalDto.ts
│   │   │   │       ├── ReadingProgressDto.ts
│   │   │   │       ├── ReadingStatisticsDto.ts
│   │   │   │       └── StreakDataDto.ts
│   │   │   ├── event-handlers
│   │   │   │   └── ProgressHandlers.ts
│   │   │   ├── mappers
│   │   │   │   └── ProgressMapper.ts
│   │   │   ├── ports
│   │   │   │   └── read-models
│   │   │   │       └── UserAchievementsReadModel.ts
│   │   │   └── queries
│   │   │       ├── GetProgressDashboard
│   │   │       │   └── handler.ts
│   │   │       ├── GetReadingCalendarQuery
│   │   │       │   ├── dto.ts
│   │   │       │   └── index.ts
│   │   │       ├── GetReadingGoalQuery
│   │   │       │   ├── dto.ts
│   │   │       │   └── index.ts
│   │   │       ├── GetReadingStatisticsQuery
│   │   │       │   ├── dto.ts
│   │   │       │   └── index.ts
│   │   │       ├── GetReadingStreakQuery
│   │   │       │   ├── dto.ts
│   │   │       │   └── index.ts
│   │   │       ├── CalculateReadingProgressQuery.ts
│   │   │       └── GetReadingGoalsQuery.ts
│   │   ├── domain
│   │   │   ├── collections
│   │   │   │   └── AchievementCollection.ts
│   │   │   ├── entities
│   │   │   │   ├── Achievement.ts
│   │   │   │   ├── ActivityLog.ts
│   │   │   │   ├── ReadingGoal.test.ts
│   │   │   │   ├── ReadingGoal.ts
│   │   │   │   ├── ReadingStreak.ts
│   │   │   │   └── UserProgress.ts
│   │   │   ├── events
│   │   │   │   ├── index.ts
│   │   │   │   └── ProgressEvents.ts
│   │   │   ├── policies
│   │   │   │   └── LevelPolicy.ts
│   │   │   ├── repositories
│   │   │   │   ├── ports
│   │   │   │   │   └── ProgressRepositoryContract.ts
│   │   │   │   ├── ProgressRepository.ts
│   │   │   │   ├── ReadingActivityRepository.ts
│   │   │   │   └── ReadingGoalRepository.ts
│   │   │   ├── value-objects
│   │   │   │   ├── ExperiencePoints.ts
│   │   │   │   ├── Level.ts
│   │   │   │   ├── ReadingActivity.ts
│   │   │   │   ├── ReadingGoal.ts
│   │   │   │   └── ReadingStreak.ts
│   │   │   └── UserProgress.test.ts
│   │   ├── infrastructure
│   │   │   ├── mappers
│   │   │   │   └── ProgressMapper.ts
│   │   │   ├── read-models
│   │   │   │   ├── SupabaseReadingCalendarReadModel.ts
│   │   │   │   ├── SupabaseReadingGoalReadModel.ts
│   │   │   │   ├── SupabaseReadingStatisticsReadModel.ts
│   │   │   │   ├── SupabaseReadingStreakReadModel.ts
│   │   │   │   └── SupabaseUserAchievementsReadModel.ts
│   │   │   └── repositories
│   │   │       ├── SupabaseProgressRepository.ts
│   │   │       ├── SupabaseReadingActivityRepository.ts
│   │   │       ├── SupabaseReadingGoalRepository.test.ts
│   │   │       └── SupabaseReadingGoalRepository.ts
│   │   ├── presentation
│   │   │   ├── actions
│   │   │   │   └── progress.ts
│   │   │   └── components
│   │   │       └── ProgressDashboardScreen.tsx
│   │   └── ProgressModule.ts
│   ├── reader
│   │   ├── annotations
│   │   │   ├── actions
│   │   │   │   ├── annotationActions.ts
│   │   │   │   └── sync.ts
│   │   │   ├── application
│   │   │   │   ├── dto
│   │   │   │   │   └── response
│   │   │   │   │       ├── AnnotationsPageDto.ts
│   │   │   │   │       └── NotesPageDto.ts
│   │   │   │   ├── facades
│   │   │   │   │   ├── AnnotationsPageFacade.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── NotesPageFacade.ts
│   │   │   │   └── ports
│   │   │   │       └── read-models
│   │   │   │           ├── AnnotationsReadModel.ts
│   │   │   │           └── NotesReadModel.ts
│   │   │   ├── components
│   │   │   │   ├── AnnotationCard.tsx
│   │   │   │   ├── AnnotationLayer.tsx
│   │   │   │   ├── AnnotationsClient.tsx
│   │   │   │   ├── NoteCard.tsx
│   │   │   │   └── NotesClient.tsx
│   │   │   ├── infrastructure
│   │   │   │   └── read-models
│   │   │   │       ├── SupabaseAnnotationsReadModel.ts
│   │   │   │       └── SupabaseNotesReadModel.ts
│   │   │   ├── services
│   │   │   │   └── annotation-sync.ts
│   │   │   ├── state
│   │   │   │   └── annotation-store.ts
│   │   │   └── types
│   │   │       └── models.ts
│   │   ├── application
│   │   │   ├── commands
│   │   │   │   ├── FinishReadingSession
│   │   │   │   │   ├── command.ts
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── input.ts
│   │   │   │   │   └── output.ts
│   │   │   │   ├── LogHighlight
│   │   │   │   │   ├── command.ts
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── input.ts
│   │   │   │   │   └── output.ts
│   │   │   │   ├── StartReadingSession
│   │   │   │   │   ├── command.ts
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── input.ts
│   │   │   │   │   └── output.ts
│   │   │   │   ├── CompleteBookCommand.ts
│   │   │   │   ├── CompleteReadingSessionCommand.ts
│   │   │   │   ├── CreateBookmarkCommand.ts
│   │   │   │   ├── CreateHighlightCommand.ts
│   │   │   │   ├── CreateNoteCommand.ts
│   │   │   │   ├── DeleteBookmarkCommand.ts
│   │   │   │   ├── DeleteHighlightCommand.ts
│   │   │   │   ├── DeleteNoteCommand.ts
│   │   │   │   ├── StartReadingSessionCommand.ts
│   │   │   │   ├── UpdateNoteCommand.ts
│   │   │   │   └── UpdateReaderPositionCommand.ts
│   │   │   ├── dto
│   │   │   │   ├── response
│   │   │   │   │   ├── BookmarkDto.ts
│   │   │   │   │   ├── HighlightDto.ts
│   │   │   │   │   ├── ReaderPositionDto.ts
│   │   │   │   │   └── ReadingSessionDto.ts
│   │   │   │   ├── ReaderAccessDto.ts
│   │   │   │   └── ReaderPageDto.ts
│   │   │   ├── errors
│   │   │   │   └── ReaderAccessError.ts
│   │   │   ├── facades
│   │   │   │   ├── index.ts
│   │   │   │   ├── ReaderFacade.ts
│   │   │   │   └── ReaderSessionFacade.ts
│   │   │   ├── mappers
│   │   │   │   └── ReaderMapper.ts
│   │   │   ├── policy
│   │   │   │   ├── CanonicalStorageKey.test.ts
│   │   │   │   ├── CanonicalStorageKey.ts
│   │   │   │   └── ReaderAccessPolicy.ts
│   │   │   ├── ports
│   │   │   │   ├── AnnotationAnchor.ts
│   │   │   │   ├── DocumentEngine.ts
│   │   │   │   ├── ReaderRenderer.ts
│   │   │   │   └── ReaderSession.ts
│   │   │   ├── queries
│   │   │   │   ├── GetActiveSession
│   │   │   │   │   ├── handler.ts
│   │   │   │   │   ├── query.ts
│   │   │   │   │   └── read-model.ts
│   │   │   │   ├── GetSessionById
│   │   │   │   ├── GetBookmarksQuery.ts
│   │   │   │   ├── GetHighlightsQuery.ts
│   │   │   │   ├── GetNotesQuery.ts
│   │   │   │   └── GetReaderPositionQuery.ts
│   │   │   ├── services
│   │   │   │   ├── ReaderAccessService.test.ts
│   │   │   │   ├── ReaderAccessService.ts
│   │   │   │   └── ReadingStreakTracker.ts
│   │   │   └── ReaderService.ts
│   │   ├── components
│   │   │   ├── Sidebar
│   │   │   │   ├── AnnotationSidebar.test.tsx
│   │   │   │   ├── AnnotationSidebar.tsx
│   │   │   │   ├── PageSideRail.test.tsx
│   │   │   │   └── PageSideRail.tsx
│   │   │   ├── toolbar
│   │   │   │   ├── AnnotationToolbar.test.tsx
│   │   │   │   ├── AnnotationToolbar.tsx
│   │   │   │   ├── NavigationToolbar.test.tsx
│   │   │   │   ├── NavigationToolbar.tsx
│   │   │   │   ├── ProgressToolbar.test.tsx
│   │   │   │   ├── ProgressToolbar.tsx
│   │   │   │   ├── SettingsToolbar.test.tsx
│   │   │   │   ├── SettingsToolbar.tsx
│   │   │   │   └── Toolbar.tsx
│   │   │   ├── viewer
│   │   │   │   └── Viewer.tsx
│   │   │   ├── ClientReaderShell.tsx
│   │   │   ├── HighlightContextMenu.test.tsx
│   │   │   ├── HighlightContextMenu.tsx
│   │   │   ├── HighlightPopup.tsx
│   │   │   ├── NoteEditor.tsx
│   │   │   ├── NoteHoverTooltip.test.tsx
│   │   │   ├── NoteHoverTooltip.tsx
│   │   │   └── ReaderShell.tsx
│   │   ├── domain
│   │   │   ├── events
│   │   │   │   └── ReaderEvents.ts
│   │   │   ├── models
│   │   │   │   └── ReaderTypes.ts
│   │   │   ├── repositories
│   │   │   │   ├── BookmarkRepository.ts
│   │   │   │   ├── HighlightRepository.ts
│   │   │   │   └── ReaderPositionRepository.ts
│   │   │   ├── Bookmark.ts
│   │   │   ├── BookmarkCollection.ts
│   │   │   ├── Events.ts
│   │   │   ├── Highlight.ts
│   │   │   ├── HighlightCollection.ts
│   │   │   ├── ReaderSession.test.ts
│   │   │   ├── ReaderSession.ts
│   │   │   └── ReadingPosition.ts
│   │   ├── infrastructure
│   │   │   ├── repositories
│   │   │   │   ├── SupabaseBookmarkRepository.ts
│   │   │   │   ├── SupabaseHighlightRepository.ts
│   │   │   │   └── SupabaseReaderPositionRepository.ts
│   │   │   ├── ReaderRepository.ts
│   │   │   ├── ReaderRepositoryContract.test.ts
│   │   │   └── SupabaseReaderRepository.ts
│   │   ├── presentation
│   │   │   ├── actions
│   │   │   │   ├── reader.test.ts
│   │   │   │   └── reader.ts
│   │   │   └── screens
│   │   ├── services
│   │   │   └── parser
│   │   │       ├── epub
│   │   │       │   ├── epub-sanitizer.test.ts
│   │   │       │   ├── epub-sanitizer.ts
│   │   │       │   ├── EpubEngine.ts
│   │   │       │   └── EpubJsRenderer.ts
│   │   │       ├── pdf
│   │   │       │   ├── pdfjs-config.test.ts
│   │   │       │   ├── pdfjs-config.ts
│   │   │       │   ├── PdfJsEngine.ts
│   │   │       │   ├── PdfJsRenderer.test.ts
│   │   │       │   └── PdfJsRenderer.ts
│   │   │       └── RendererFactory.ts
│   │   ├── state
│   │   │   └── reader-store.ts
│   │   ├── ARCHITECTURE.md
│   │   └── ReadingWorkspaceIntegration.test.ts
│   ├── security
│   │   ├── application
│   │   │   ├── BearerAuthGuard.ts
│   │   │   ├── requireAuth.ts
│   │   │   └── SecurityService.ts
│   │   ├── domain
│   │   │   ├── AuditLogger.ts
│   │   │   ├── AuthenticationProvider.ts
│   │   │   ├── MfaPolicy.ts
│   │   │   └── RateLimiter.ts
│   │   └── infrastructure
│   │       ├── PostgresAuditLogger.test.ts
│   │       ├── PostgresAuditLogger.ts
│   │       ├── SupabaseAuthenticationProvider.ts
│   │       └── SupabaseRateLimiter.ts
│   ├── statistics
│   │   ├── application
│   │   │   ├── ports
│   │   │   │   └── read-models
│   │   │   │       └── PlatformStatisticsReadModel.ts
│   │   │   └── queries
│   │   │       └── GetPlatformStatistics
│   │   │           ├── handler.ts
│   │   │           ├── index.ts
│   │   │           └── read-model.ts
│   │   ├── domain
│   │   │   └── repositories
│   │   └── infrastructure
│   │       ├── read-models
│   │       │   └── SupabasePlatformStatisticsReadModel.ts
│   │       └── repositories
│   ├── storage
│   │   ├── components
│   │   │   └── UniversalFileUpload.tsx
│   │   ├── pages
│   │   ├── presentation
│   │   │   └── actions
│   │   │       └── storage.ts
│   │   ├── services
│   │   │   └── pdf-description-generator.ts
│   │   └── types
│   ├── subjects
│   │   ├── application
│   │   │   └── commands
│   │   │       ├── CreateSubjectCommand.ts
│   │   │       ├── DeleteSubjectCommand.ts
│   │   │       ├── index.ts
│   │   │       └── UpdateSubjectCommand.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   └── Subject.ts
│   │   │   └── repositories
│   │   │       └── SubjectRepository.ts
│   │   └── infrastructure
│   │       └── SupabaseSubjectRepository.ts
│   ├── support
│   │   ├── application
│   │   │   ├── commands
│   │   │   │   ├── SubmitReportCommand.test.ts
│   │   │   │   └── SubmitReportCommand.ts
│   │   │   ├── dto
│   │   │   │   └── FaqDto.ts
│   │   │   ├── ports
│   │   │   │   └── read-models
│   │   │   │       └── SupportReadModel.ts
│   │   │   └── queries
│   │   │       └── GetFaqs
│   │   │           └── handler.ts
│   │   ├── domain
│   │   │   ├── entities
│   │   │   │   ├── PlatformReport.test.ts
│   │   │   │   └── PlatformReport.ts
│   │   │   └── repositories
│   │   │       └── IPlatformReportRepository.ts
│   │   ├── infrastructure
│   │   │   ├── read-models
│   │   │   │   └── SupabaseSupportReadModel.ts
│   │   │   └── repositories
│   │   │       ├── SupabasePlatformReportRepository.test.ts
│   │   │       └── SupabasePlatformReportRepository.ts
│   │   └── presentation
│   │       └── actions
│   │           ├── reportActions.test.ts
│   │           └── reportActions.ts
│   └── user
│       └── profile
│           ├── application
│           │   ├── commands
│           │   │   ├── DeleteAccount
│           │   │   │   ├── DeleteAccountCommand.ts
│           │   │   │   └── handler.ts
│           │   │   ├── SetupProfile
│           │   │   │   ├── command.ts
│           │   │   │   └── handler.ts
│           │   │   └── UpdateProfile
│           │   │       ├── command.ts
│           │   │       └── handler.ts
│           │   ├── facades
│           │   │   ├── index.ts
│           │   │   └── ProfilePageFacade.ts
│           │   ├── ports
│           │   │   └── repositories
│           │   │       ├── InMemoryProfileRepository.ts
│           │   │       └── ProfileRepositoryContract.test.ts
│           │   ├── queries
│           │   │   ├── ExportUserData
│           │   │   │   ├── ExportUserDataQuery.ts
│           │   │   │   └── handler.ts
│           │   │   ├── GetProfile
│           │   │   │   ├── handler.ts
│           │   │   │   └── read-model.ts
│           │   │   └── GetUnreadNotificationCountQuery
│           │   │       └── handler.ts
│           │   └── validators
│           │       └── updateProfileSchema.ts
│           ├── domain
│           │   ├── entities
│           │   │   ├── UserProfile.test.ts
│           │   │   └── UserProfile.ts
│           │   ├── errors
│           │   ├── events
│           │   │   ├── index.ts
│           │   │   └── ProfileEvents.ts
│           │   ├── repositories
│           │   │   ├── AccountDeletionRepository.ts
│           │   │   └── ProfileRepository.ts
│           │   └── value-objects
│           │       └── index.ts
│           ├── infrastructure
│           │   ├── mappers
│           │   │   └── ProfileMapper.ts
│           │   ├── read-models
│           │   │   └── SupabaseNotificationReadModel.ts
│           │   └── repositories
│           │       ├── SupabaseAccountDeletionRepository.ts
│           │       └── SupabaseProfileRepository.ts
│           └── presentation
│               ├── actions
│               │   ├── notifications.ts
│               │   └── profile.ts
│               └── components
│                   ├── ProfileEditForm.tsx
│                   ├── ProfileHeader.tsx
│                   ├── ProfileOverview.tsx
│                   └── ProfileStats.tsx
├── public
│   ├── pdfjs
│   │   ├── cmaps
│   │   │   ├── 78-EUC-H.bcmap
│   │   │   ├── 78-EUC-V.bcmap
│   │   │   ├── 78-H.bcmap
│   │   │   ├── 78-RKSJ-H.bcmap
│   │   │   ├── 78-RKSJ-V.bcmap
│   │   │   ├── 78-V.bcmap
│   │   │   ├── 78ms-RKSJ-H.bcmap
│   │   │   ├── 78ms-RKSJ-V.bcmap
│   │   │   ├── 83pv-RKSJ-H.bcmap
│   │   │   ├── 90ms-RKSJ-H.bcmap
│   │   │   ├── 90ms-RKSJ-V.bcmap
│   │   │   ├── 90msp-RKSJ-H.bcmap
│   │   │   ├── 90msp-RKSJ-V.bcmap
│   │   │   ├── 90pv-RKSJ-H.bcmap
│   │   │   ├── 90pv-RKSJ-V.bcmap
│   │   │   ├── Add-H.bcmap
│   │   │   ├── Add-RKSJ-H.bcmap
│   │   │   ├── Add-RKSJ-V.bcmap
│   │   │   ├── Add-V.bcmap
│   │   │   ├── Adobe-CNS1-0.bcmap
│   │   │   ├── Adobe-CNS1-1.bcmap
│   │   │   ├── Adobe-CNS1-2.bcmap
│   │   │   ├── Adobe-CNS1-3.bcmap
│   │   │   ├── Adobe-CNS1-4.bcmap
│   │   │   ├── Adobe-CNS1-5.bcmap
│   │   │   ├── Adobe-CNS1-6.bcmap
│   │   │   ├── Adobe-CNS1-UCS2.bcmap
│   │   │   ├── Adobe-GB1-0.bcmap
│   │   │   ├── Adobe-GB1-1.bcmap
│   │   │   ├── Adobe-GB1-2.bcmap
│   │   │   ├── Adobe-GB1-3.bcmap
│   │   │   ├── Adobe-GB1-4.bcmap
│   │   │   ├── Adobe-GB1-5.bcmap
│   │   │   ├── Adobe-GB1-UCS2.bcmap
│   │   │   ├── Adobe-Japan1-0.bcmap
│   │   │   ├── Adobe-Japan1-1.bcmap
│   │   │   ├── Adobe-Japan1-2.bcmap
│   │   │   ├── Adobe-Japan1-3.bcmap
│   │   │   ├── Adobe-Japan1-4.bcmap
│   │   │   ├── Adobe-Japan1-5.bcmap
│   │   │   ├── Adobe-Japan1-6.bcmap
│   │   │   ├── Adobe-Japan1-UCS2.bcmap
│   │   │   ├── Adobe-Korea1-0.bcmap
│   │   │   ├── Adobe-Korea1-1.bcmap
│   │   │   ├── Adobe-Korea1-2.bcmap
│   │   │   ├── Adobe-Korea1-UCS2.bcmap
│   │   │   ├── B5-H.bcmap
│   │   │   ├── B5-V.bcmap
│   │   │   ├── B5pc-H.bcmap
│   │   │   ├── B5pc-V.bcmap
│   │   │   ├── CNS-EUC-H.bcmap
│   │   │   ├── CNS-EUC-V.bcmap
│   │   │   ├── CNS1-H.bcmap
│   │   │   ├── CNS1-V.bcmap
│   │   │   ├── CNS2-H.bcmap
│   │   │   ├── CNS2-V.bcmap
│   │   │   ├── ETen-B5-H.bcmap
│   │   │   ├── ETen-B5-V.bcmap
│   │   │   ├── ETenms-B5-H.bcmap
│   │   │   ├── ETenms-B5-V.bcmap
│   │   │   ├── ETHK-B5-H.bcmap
│   │   │   ├── ETHK-B5-V.bcmap
│   │   │   ├── EUC-H.bcmap
│   │   │   ├── EUC-V.bcmap
│   │   │   ├── Ext-H.bcmap
│   │   │   ├── Ext-RKSJ-H.bcmap
│   │   │   ├── Ext-RKSJ-V.bcmap
│   │   │   ├── Ext-V.bcmap
│   │   │   ├── GB-EUC-H.bcmap
│   │   │   ├── GB-EUC-V.bcmap
│   │   │   ├── GB-H.bcmap
│   │   │   ├── GB-V.bcmap
│   │   │   ├── GBK-EUC-H.bcmap
│   │   │   ├── GBK-EUC-V.bcmap
│   │   │   ├── GBK2K-H.bcmap
│   │   │   ├── GBK2K-V.bcmap
│   │   │   ├── GBKp-EUC-H.bcmap
│   │   │   ├── GBKp-EUC-V.bcmap
│   │   │   ├── GBpc-EUC-H.bcmap
│   │   │   ├── GBpc-EUC-V.bcmap
│   │   │   ├── GBT-EUC-H.bcmap
│   │   │   ├── GBT-EUC-V.bcmap
│   │   │   ├── GBT-H.bcmap
│   │   │   ├── GBT-V.bcmap
│   │   │   ├── GBTpc-EUC-H.bcmap
│   │   │   ├── GBTpc-EUC-V.bcmap
│   │   │   ├── H.bcmap
│   │   │   ├── Hankaku.bcmap
│   │   │   ├── Hiragana.bcmap
│   │   │   ├── HKdla-B5-H.bcmap
│   │   │   ├── HKdla-B5-V.bcmap
│   │   │   ├── HKdlb-B5-H.bcmap
│   │   │   ├── HKdlb-B5-V.bcmap
│   │   │   ├── HKgccs-B5-H.bcmap
│   │   │   ├── HKgccs-B5-V.bcmap
│   │   │   ├── HKm314-B5-H.bcmap
│   │   │   ├── HKm314-B5-V.bcmap
│   │   │   ├── HKm471-B5-H.bcmap
│   │   │   ├── HKm471-B5-V.bcmap
│   │   │   ├── HKscs-B5-H.bcmap
│   │   │   ├── HKscs-B5-V.bcmap
│   │   │   ├── Katakana.bcmap
│   │   │   ├── KSC-EUC-H.bcmap
│   │   │   ├── KSC-EUC-V.bcmap
│   │   │   ├── KSC-H.bcmap
│   │   │   ├── KSC-Johab-H.bcmap
│   │   │   ├── KSC-Johab-V.bcmap
│   │   │   ├── KSC-V.bcmap
│   │   │   ├── KSCms-UHC-H.bcmap
│   │   │   ├── KSCms-UHC-HW-H.bcmap
│   │   │   ├── KSCms-UHC-HW-V.bcmap
│   │   │   ├── KSCms-UHC-V.bcmap
│   │   │   ├── KSCpc-EUC-H.bcmap
│   │   │   ├── KSCpc-EUC-V.bcmap
│   │   │   ├── LICENSE
│   │   │   ├── NWP-H.bcmap
│   │   │   ├── NWP-V.bcmap
│   │   │   ├── RKSJ-H.bcmap
│   │   │   ├── RKSJ-V.bcmap
│   │   │   ├── Roman.bcmap
│   │   │   ├── UniCNS-UCS2-H.bcmap
│   │   │   ├── UniCNS-UCS2-V.bcmap
│   │   │   ├── UniCNS-UTF8-H.bcmap
│   │   │   ├── UniCNS-UTF8-V.bcmap
│   │   │   ├── UniCNS-UTF16-H.bcmap
│   │   │   ├── UniCNS-UTF16-V.bcmap
│   │   │   ├── UniCNS-UTF32-H.bcmap
│   │   │   ├── UniCNS-UTF32-V.bcmap
│   │   │   ├── UniGB-UCS2-H.bcmap
│   │   │   ├── UniGB-UCS2-V.bcmap
│   │   │   ├── UniGB-UTF8-H.bcmap
│   │   │   ├── UniGB-UTF8-V.bcmap
│   │   │   ├── UniGB-UTF16-H.bcmap
│   │   │   ├── UniGB-UTF16-V.bcmap
│   │   │   ├── UniGB-UTF32-H.bcmap
│   │   │   ├── UniGB-UTF32-V.bcmap
│   │   │   ├── UniJIS-UCS2-H.bcmap
│   │   │   ├── UniJIS-UCS2-HW-H.bcmap
│   │   │   ├── UniJIS-UCS2-HW-V.bcmap
│   │   │   ├── UniJIS-UCS2-V.bcmap
│   │   │   ├── UniJIS-UTF8-H.bcmap
│   │   │   ├── UniJIS-UTF8-V.bcmap
│   │   │   ├── UniJIS-UTF16-H.bcmap
│   │   │   ├── UniJIS-UTF16-V.bcmap
│   │   │   ├── UniJIS-UTF32-H.bcmap
│   │   │   ├── UniJIS-UTF32-V.bcmap
│   │   │   ├── UniJIS2004-UTF8-H.bcmap
│   │   │   ├── UniJIS2004-UTF8-V.bcmap
│   │   │   ├── UniJIS2004-UTF16-H.bcmap
│   │   │   ├── UniJIS2004-UTF16-V.bcmap
│   │   │   ├── UniJIS2004-UTF32-H.bcmap
│   │   │   ├── UniJIS2004-UTF32-V.bcmap
│   │   │   ├── UniJISPro-UCS2-HW-V.bcmap
│   │   │   ├── UniJISPro-UCS2-V.bcmap
│   │   │   ├── UniJISPro-UTF8-V.bcmap
│   │   │   ├── UniJISX0213-UTF32-H.bcmap
│   │   │   ├── UniJISX0213-UTF32-V.bcmap
│   │   │   ├── UniJISX02132004-UTF32-H.bcmap
│   │   │   ├── UniJISX02132004-UTF32-V.bcmap
│   │   │   ├── UniKS-UCS2-H.bcmap
│   │   │   ├── UniKS-UCS2-V.bcmap
│   │   │   ├── UniKS-UTF8-H.bcmap
│   │   │   ├── UniKS-UTF8-V.bcmap
│   │   │   ├── UniKS-UTF16-H.bcmap
│   │   │   ├── UniKS-UTF16-V.bcmap
│   │   │   ├── UniKS-UTF32-H.bcmap
│   │   │   ├── UniKS-UTF32-V.bcmap
│   │   │   ├── V.bcmap
│   │   │   └── WP-Symbol.bcmap
│   │   ├── standard_fonts
│   │   │   ├── FoxitDingbats.pfb
│   │   │   ├── FoxitFixed.pfb
│   │   │   ├── FoxitFixedBold.pfb
│   │   │   ├── FoxitFixedBoldItalic.pfb
│   │   │   ├── FoxitFixedItalic.pfb
│   │   │   ├── FoxitSerif.pfb
│   │   │   ├── FoxitSerifBold.pfb
│   │   │   ├── FoxitSerifBoldItalic.pfb
│   │   │   ├── FoxitSerifItalic.pfb
│   │   │   ├── FoxitSymbol.pfb
│   │   │   ├── LiberationSans-Bold.ttf
│   │   │   ├── LiberationSans-BoldItalic.ttf
│   │   │   ├── LiberationSans-Italic.ttf
│   │   │   ├── LiberationSans-Regular.ttf
│   │   │   ├── LICENSE_FOXIT
│   │   │   └── LICENSE_LIBERATION
│   │   └── pdf.worker.min.mjs
│   ├── about_cta_banner.jpg
│   ├── about_showcase.jpg
│   ├── auth_login_bg.jpg
│   ├── auth_signup_bg.jpg
│   ├── book-placeholder.svg
│   ├── default_book_cover.jpg
│   ├── favicon.ico
│   ├── hero_library_bg.jpg
│   ├── hero_light_bg.jpg
│   ├── hero_sanctuary_bg.jpg
│   ├── icon.png
│   ├── library_bg.png
│   ├── logo.png
│   ├── logo.svg
│   └── mock-document.pdf
├── scratch
├── scripts
│   ├── sanitize-codebase.mjs
│   └── update-tree.mjs
├── shared
│   ├── application
│   │   ├── dto
│   │   │   └── AuthenticatedUser.ts
│   │   ├── events
│   │   │   ├── DomainEventPublisher.ts
│   │   │   ├── EventBus.ts
│   │   │   ├── EventEnvelope.ts
│   │   │   ├── EventHandler.ts
│   │   │   ├── EventMetadata.ts
│   │   │   ├── EventModule.ts
│   │   │   └── EventRegistry.ts
│   │   ├── ports
│   │   │   └── identity
│   │   │       └── IdentityProvider.ts
│   │   └── projections
│   │       └── ProjectionBuilder.ts
│   ├── config
│   ├── constants
│   ├── core
│   │   ├── application
│   │   │   └── UseCaseResult.ts
│   │   ├── auth
│   │   │   └── SendLoginEmailWebhook.test.ts
│   │   ├── components
│   │   │   └── GlobalErrorBoundary.tsx
│   │   ├── database
│   │   │   ├── admin.ts
│   │   │   ├── client.ts
│   │   │   ├── database.types.ts
│   │   │   └── server.ts
│   │   ├── events
│   │   │   ├── EventBus.test.ts
│   │   │   ├── EventBus.ts
│   │   │   ├── payload-validators.test.ts
│   │   │   ├── payload-validators.ts
│   │   │   └── types.ts
│   │   ├── infrastructure
│   │   │   └── outbox
│   │   │       └── outbox.ts
│   │   ├── jobs
│   │   │   ├── outbox-relay.test.ts
│   │   │   └── outbox-relay.ts
│   │   ├── storage
│   │   │   ├── privacy-storage.test.ts
│   │   │   └── privacy-storage.ts
│   │   ├── types
│   │   │   ├── database.ts
│   │   │   ├── LibraryReadModels.ts
│   │   │   └── supabase.ts
│   │   └── utils
│   │       └── redirect.ts
│   ├── domain
│   │   └── events
│   │       └── DomainEvent.ts
│   ├── feedback
│   │   └── components
│   │       └── AppToaster.tsx
│   ├── hooks
│   │   └── usePhotoUploadPermission.ts
│   ├── infrastructure
│   │   ├── database
│   │   │   ├── OutboxTrustBoundary.test.ts
│   │   │   ├── WorkerDatabaseClient.test.ts
│   │   │   └── WorkerDatabaseClient.ts
│   │   ├── events
│   │   │   ├── DomainEventPublisher.test.ts
│   │   │   ├── EventDispatcher.ts
│   │   │   ├── IdempotencyGuard.ts
│   │   │   ├── InProcessEventBus.test.ts
│   │   │   └── InProcessEventBus.ts
│   │   ├── identity
│   │   │   └── SupabaseIdentityProvider.ts
│   │   ├── outbox
│   │   │   └── serializeStagedEvents.ts
│   │   └── projections
│   │       └── ProjectionRegistry.ts
│   ├── kernel
│   │   ├── navigation
│   │   │   └── AppRoutes.ts
│   │   ├── security
│   │   │   ├── Permission.ts
│   │   │   ├── PermissionService.ts
│   │   │   └── SecurityAction.ts
│   │   ├── AggregateRoot.ts
│   │   ├── DomainError.ts
│   │   ├── DomainEvent.ts
│   │   ├── Entity.ts
│   │   ├── UserId.ts
│   │   └── ValueObject.ts
│   ├── layout
│   │   ├── AppHeader
│   │   │   ├── AppHeader.tsx
│   │   │   ├── index.ts
│   │   │   └── UserMenu.tsx
│   │   ├── AppPage
│   │   │   ├── AppPage.tsx
│   │   │   └── index.ts
│   │   ├── Footer
│   │   │   └── Footer.tsx
│   │   ├── PageContainer
│   │   │   ├── index.ts
│   │   │   └── PageContainer.tsx
│   │   ├── index.ts
│   │   └── layout.css
│   ├── navigation
│   │   ├── actions
│   │   ├── pages
│   │   ├── services
│   │   ├── types
│   │   └── README.md
│   ├── providers
│   │   └── theme-context.tsx
│   ├── ui
│   │   ├── Button
│   │   │   ├── Button.module.css
│   │   │   ├── Button.tsx
│   │   │   └── index.ts
│   │   ├── Card
│   │   │   ├── Card.module.css
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   ├── components
│   │   │   ├── AuthGuard.tsx
│   │   │   └── Card.tsx
│   │   ├── Dropdown
│   │   │   ├── Dropdown.module.css
│   │   │   ├── Dropdown.tsx
│   │   │   └── index.ts
│   │   ├── EmptyState
│   │   │   ├── EmptyState.tsx
│   │   │   └── index.ts
│   │   ├── Icon
│   │   │   ├── Icon.module.css
│   │   │   ├── Icon.tsx
│   │   │   └── index.ts
│   │   ├── Input
│   │   │   ├── index.ts
│   │   │   ├── Input.module.css
│   │   │   └── Input.tsx
│   │   ├── Modal
│   │   │   ├── index.ts
│   │   │   ├── Modal.module.css
│   │   │   └── Modal.tsx
│   │   ├── animations.tsx
│   │   ├── BackButton.tsx
│   │   ├── FormError.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── motion.tsx
│   │   ├── PhotoUploadConsentModal.tsx
│   │   ├── PlaceholderScreen.tsx
│   │   ├── SkeletonLoader.tsx
│   │   ├── skeletons.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── tokens.ts
│   └── utils
├── styles
│   ├── base
│   │   ├── body.css
│   │   ├── html.css
│   │   └── reset.css
│   ├── docs
│   │   ├── ACCESSIBILITY.md
│   │   ├── COMPONENTS.md
│   │   ├── CONTRIBUTING.md
│   │   ├── DECISIONS.md
│   │   ├── LAYOUTS.md
│   │   ├── NAMING.md
│   │   ├── THEMES.md
│   │   └── TOKENS.md
│   ├── foundation
│   │   ├── elevation.css
│   │   ├── motion.css
│   │   ├── palette.css
│   │   ├── radius.css
│   │   ├── spacing.css
│   │   ├── states.css
│   │   ├── surfaces.css
│   │   ├── typography.css
│   │   └── z-index.css
│   ├── layouts
│   │   ├── app-shell.css
│   │   ├── cluster.css
│   │   ├── container.css
│   │   ├── grid.css
│   │   ├── page.css
│   │   ├── rail.css
│   │   ├── sidebar.css
│   │   └── stack.css
│   ├── themes
│   │   ├── dark.css
│   │   └── light.css
│   └── utilities
│       └── global-utilities.css
├── supabase
│   ├── .temp
│   │   ├── cli-latest
│   │   ├── gotrue-version
│   │   ├── linked-project.json
│   │   ├── pooler-url
│   │   ├── postgres-version
│   │   ├── project-ref
│   │   ├── rest-version
│   │   ├── storage-migration
│   │   └── storage-version
│   ├── certification
│   │   └── pr0_certification_checks.sql
│   ├── functions
│   │   └── send-login-email
│   │       ├── .npmrc
│   │       ├── deno.json
│   │       ├── index.ts
│   │       └── validator.ts
│   ├── migrations
│   │   ├── 20260716221802_domain_schema_normalization.sql
│   │   ├── 20260717000000_add_biography_to_profiles.sql
│   │   ├── 20260717000000_security_schema.sql
│   │   ├── 20260717000001_move_reading_goals.sql
│   │   ├── 20260717020054_discovery_recommendation_signals.sql
│   │   ├── 20260717081000_discovery_read_models.sql
│   │   ├── 20260717090000_drop_legacy_tables.sql
│   │   ├── 20260717091500_outbox_pattern.sql
│   │   ├── 20260717150000_analytics_projections.sql
│   │   ├── 20260717150001_analytics_rpcs.sql
│   │   ├── 20260717150002_analytics_backfill.sql
│   │   ├── 20260717160000_performance_tuning.sql
│   │   ├── 20260717170000_legacy_cleanup.sql
│   │   ├── 20260718000000_clean_retired_schema.sql
│   │   ├── 20260718000000_reader_m1.sql
│   │   ├── 20260718100000_reader_bookmarks.sql
│   │   ├── 20260718162040_sanitize_account_logs.sql
│   │   ├── 20260718162100_sanitize_account_logs.sql
│   │   ├── 20260718163400_increment_download_count.sql
│   │   ├── 20260718200000_security_hardening.sql
│   │   ├── 20260718300000_profile_setup_rpc.sql
│   │   ├── 20260719022000_create_announcements.sql
│   │   ├── 20260719050000_search_catalog.sql
│   │   ├── 20260719053000_create_export_requests.sql
│   │   ├── 20260719060000_discovery_search_infrastructure.sql
│   │   ├── 20260719070000_v1_architecture_simplification.sql
│   │   ├── 20260719080000_v1_database_freeze.sql
│   │   ├── 20260720000000_search_projection_schema.sql
│   │   ├── 20260720000001_search_projection_metadata.sql
│   │   ├── 20260720000002_database_globalization.sql
│   │   ├── 20260720000003_search_rpc.sql
│   │   ├── 20260720000004_search_analytics_schema.sql
│   │   ├── 20260720000005_search_facets_rpc.sql
│   │   ├── 20260720000006_search_autocomplete_rpc.sql
│   │   ├── 20260720000007_search_history_rpc.sql
│   │   ├── 20260720000008_trending_searches_projection.sql
│   │   ├── 20260720000009_synonym_expansion.sql
│   │   ├── 20260720000010_typo_tolerance.sql
│   │   ├── 20260720000011_trgm_indexes.sql
│   │   ├── 20260720000012_search_rpc_fixes.sql
│   │   ├── 20260720000013_book_admin_rpc.sql
│   │   ├── 20260720000014_book_lifecycle_columns.sql
│   │   ├── 20260720000015_book_rpc_optimistic_concurrency.sql
│   │   ├── 20260720120443_sprint_4_editorial_domains.sql
│   │   ├── 20260720132624_notifications_read_model.sql
│   │   ├── 20260721142000_split_compound_authors.sql
│   │   ├── 20260721143000_add_position_to_book_authors.sql
│   │   ├── 20260721183500_fix_discovery_refresh.sql
│   │   ├── 20260721200001_frugal_001_exact_redundancy_cleanup.sql
│   │   ├── 20260721200002_frugal_002_internal_database_boundary.sql
│   │   ├── 20260721200003_frugal_003_stale_claim_recovery.sql
│   │   ├── 20260721200004_frugal_004_database_authorization.sql
│   │   ├── 20260721200005_frugal_005_rls_normalization.sql
│   │   ├── 20260721200006_frugal_006_search_consolidation.sql
│   │   ├── 20260721200007_retire_legacy_tables.sql
│   │   ├── 20260721200008_complete_database_sanitisation.sql
│   │   ├── 20260721200009_database_security_and_policy_hardening.sql
│   │   ├── 20260721200010_revoke_security_definer_from_authenticated.sql
│   │   ├── 20260721200011_rls_policy_deduplication.sql
│   │   ├── 20260721200012_populate_canonical_book_files.sql
│   │   ├── 20260721200013_schema_table_and_column_documentation.sql
│   │   ├── 20260819185102_add_outbox_insert_policy.sql
│   │   ├── 20260820000000_implement_user_statistics.sql
│   │   ├── 20260821030000_create_user_notification_preferences.sql
│   │   ├── 20260821034900_normalize_storage_double_extensions.sql
│   │   ├── 20260821062600_map_canonical_book_covers.sql
│   │   ├── 20260821072000_drop_books_total_pages.sql
│   │   ├── 20260821072500_drop_reading_sessions_total_pages.sql
│   │   ├── 20260821073100_add_pages_to_reading_sessions.sql
│   │   ├── 20260821073700_update_book_publication_details.sql
│   │   ├── 20260822000000_recreate_audit_logs.sql
│   │   ├── 20260822000001_fix_reading_streak_trigger.sql
│   │   ├── 20260822202209_create_login_notifications_log.sql
│   │   ├── 20260823000000_create_platform_reports.sql
│   │   ├── 20260823000001_final_security_hardening.sql
│   │   ├── 20260823000002_fix_view_security.sql
│   │   ├── 20260823000003_optimize_search_rpc.sql
│   │   ├── 20260823000004_create_user_images_storage_bucket.sql
│   │   ├── 20260823000005_flexible_genre_subject_search_matching.sql
│   │   ├── 20260824000000_create_user_permissions.sql
│   │   ├── 20260824000001_initialize_user_records_on_signup.sql
│   │   ├── 20260824000002_fix_streak_and_statistics_calculation.sql
│   │   ├── 20260824000003_atomic_book_view_count_rpc.sql
│   │   ├── 20260824000004_align_discovery_refresh_popularity.sql
│   │   ├── 20260824000005_book_popularity_metrics.sql
│   │   ├── 20260824000006_trending_projection_recalculation.sql
│   │   ├── 20260824000007_search_projection_maintenance.sql
│   │   ├── 20260824000008_harden_maintenance_routine_privileges.sql
│   │   ├── 20260824170000_grant_worker_notifications_insert.sql
│   │   ├── 20260824180000_fix_announcements_rls.sql
│   │   ├── 20260828000000_frugal_schema_cleanup.sql
│   │   ├── 20260828010000_retire_export_requests.sql
│   │   ├── 20260828020000_repair_authorization_foundation.sql
│   │   ├── 20260829000000_set_default_profile_bio.sql
│   │   ├── 20260829010000_grant_trending_searches_permissions.sql
│   │   ├── 20260902000000_create_shelves_storage_bucket.sql
│   │   ├── 20260902000001_enable_avatar_storage_delete_policy.sql
│   │   ├── 20261007000000_pr1_credential_and_outbox_incident.sql
│   │   ├── 20261008000000_pr0_production_security_containment.sql
│   │   ├── 20261008000000_pr2_reader_content_security.sql
│   │   ├── 20261009000000_pr1_event_idempotency_and_deduplication.sql
│   │   └── 20261022000000_rebrand_bookgarden_announcements_and_faqs.sql
│   ├── config.toml
│   └── schema_210726183034.sql
├── templates
│   └── bounded-context
│       ├── application
│       ├── domain
│       │   ├── entities
│       │   ├── errors
│       │   ├── events
│       │   ├── repositories
│       │   └── value-objects
│       ├── infrastructure
│       │   ├── mappers
│       │   ├── models
│       │   └── repositories
│       └── presentation
├── test-results
│   ├── book-book-network-Book-Det-36f85-ce-requests-on-initial-load-chromium
│   │   └── error-context.md
│   ├── book-book-performance-Book-da078-LCP-CLS-and-network-metrics-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-access-8b7f5-tment-and-logical-tab-order-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-networ-87274-r-images-lazy-load-behavior-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-networ-f62df-ce-requests-on-initial-load-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-perfor-3783f-LCP-CLS-and-network-metrics-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-reduce-b47ad--usable-with-reduced-motion-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-respon-1f55e-at-1024x768-on-Torture-Test-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-respon-43b3c-at-1440x900-on-Torture-Test-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-respon-3561c--at-375x812-on-Torture-Test-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-respon-a80e2-at-768x1024-on-Torture-Test-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-search-7bf61-e-GET-form-submission-works-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-search-5779e-n-discover-or-does-not-fail-chromium
│   │   └── error-context.md
│   ├── discovery-discovery-search-afea1-ode-query-works-predictably-chromium
│   │   └── error-context.md
│   └── .last-run.json
├── tests
│   ├── book
│   │   ├── book-mapper.test.ts
│   │   ├── book-network.spec.ts
│   │   └── book-performance.spec.ts
│   ├── discovery
│   │   ├── discovery-accessibility.spec.ts
│   │   ├── discovery-network.spec.ts
│   │   ├── discovery-performance.spec.ts
│   │   ├── discovery-reduced-motion.spec.ts
│   │   ├── discovery-responsive.spec.ts
│   │   └── discovery-search.spec.ts
│   ├── fixtures
│   │   └── discovery-edge-cases.ts
│   └── mocks
│       └── pdfjsMock.js
├── .depcruise.js
├── .env.local
├── .gitignore
├── .unimportedrc.json
├── .vercelignore
├── ARCHITECTURE_RULES.md
├── book-performance-baseline.json
├── components.json
├── eslint.config.mjs
├── instrumentation.ts
├── jest.config.js
├── jest.setup.js
├── knip.json
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── performance-baseline.json
├── playwright.config.ts
├── postcss.config.mjs
├── proxy.ts
├── README.md
├── schema.json
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── vercel.json
```
