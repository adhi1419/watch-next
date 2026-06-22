import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// We'll test the mobile-specific components directly
// These components don't exist yet — that's the point (TDD red phase)

describe("Mobile Support", () => {
  describe("BottomDock", () => {
    it("renders 4 navigation tabs", async () => {
      const { BottomDock } = await import("../components/BottomDock");
      const onNavigate = vi.fn();
      render(<BottomDock activeTab="discover-show" onNavigate={onNavigate} />);

      expect(screen.getByLabelText("TV Shows")).toBeInTheDocument();
      expect(screen.getByLabelText("Movies")).toBeInTheDocument();
      expect(screen.getByLabelText("Search")).toBeInTheDocument();
      expect(screen.getByLabelText("History")).toBeInTheDocument();
    });

    it("highlights active tab", async () => {
      const { BottomDock } = await import("../components/BottomDock");
      render(<BottomDock activeTab="discover-show" onNavigate={vi.fn()} />);

      const tvTab = screen.getByLabelText("TV Shows");
      expect(tvTab.className).toContain("text-[var(--color-accent)]");
    });

    it("calls onNavigate with correct tab id", async () => {
      const { BottomDock } = await import("../components/BottomDock");
      const onNavigate = vi.fn();
      render(<BottomDock activeTab="discover-show" onNavigate={onNavigate} />);

      fireEvent.click(screen.getByLabelText("Movies"));
      expect(onNavigate).toHaveBeenCalledWith("discover-movie");

      fireEvent.click(screen.getByLabelText("History"));
      expect(onNavigate).toHaveBeenCalledWith("history");
    });
  });

  describe("SearchOverlay", () => {
    it("renders with auto-focused input", async () => {
      const { SearchOverlay } = await import("../components/SearchOverlay");
      render(
        <SearchOverlay
          onClose={vi.fn()}
          onSearch={vi.fn()}
          sortBy="IMDB_SCORE"
          onSortChange={vi.fn()}
          genres={[]}
          onGenreToggle={vi.fn()}
          allPlatforms={false}
          onPlatformToggle={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText("Search shows and movies...");
      expect(input).toBeInTheDocument();
      await waitFor(() => expect(document.activeElement).toBe(input));
    });

    it("calls onClose when X is clicked", async () => {
      const { SearchOverlay } = await import("../components/SearchOverlay");
      const onClose = vi.fn();
      render(
        <SearchOverlay
          onClose={onClose}
          onSearch={vi.fn()}
          sortBy="IMDB_SCORE"
          onSortChange={vi.fn()}
          genres={[]}
          onGenreToggle={vi.fn()}
          allPlatforms={false}
          onPlatformToggle={vi.fn()}
        />
      );

      fireEvent.click(screen.getByLabelText("Close search"));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onSearch as user types", async () => {
      const { SearchOverlay } = await import("../components/SearchOverlay");
      const onSearch = vi.fn();
      render(
        <SearchOverlay
          onClose={vi.fn()}
          onSearch={onSearch}
          sortBy="IMDB_SCORE"
          onSortChange={vi.fn()}
          genres={[]}
          onGenreToggle={vi.fn()}
          allPlatforms={false}
          onPlatformToggle={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText("Search shows and movies...");
      fireEvent.change(input, { target: { value: "arcane" } });
      expect(onSearch).toHaveBeenCalledWith("arcane");
    });

    it("shows filter panel when filter button is tapped", async () => {
      const { SearchOverlay } = await import("../components/SearchOverlay");
      render(
        <SearchOverlay
          onClose={vi.fn()}
          onSearch={vi.fn()}
          sortBy="IMDB_SCORE"
          onSortChange={vi.fn()}
          genres={[]}
          onGenreToggle={vi.fn()}
          allPlatforms={false}
          onPlatformToggle={vi.fn()}
        />
      );

      fireEvent.click(screen.getByLabelText("Filters"));
      expect(screen.getByText("Sort")).toBeInTheDocument();
      expect(screen.getByText("Genre")).toBeInTheDocument();
    });
  });

  describe("useIsMobile hook", () => {
    it("returns true for width < 768", async () => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
      const { useIsMobile } = await import("../hooks/useIsMobile");

      let result: boolean | undefined;
      function TestComponent() {
        result = useIsMobile();
        return null;
      }

      const { render: r } = await import("@testing-library/react");
      r(<TestComponent />);
      expect(result).toBe(true);
    });

    it("returns false for width >= 768", async () => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });
      const { useIsMobile } = await import("../hooks/useIsMobile");

      let result: boolean | undefined;
      function TestComponent() {
        result = useIsMobile();
        return null;
      }

      const { render: r } = await import("@testing-library/react");
      r(<TestComponent />);
      expect(result).toBe(false);
    });
  });
});
