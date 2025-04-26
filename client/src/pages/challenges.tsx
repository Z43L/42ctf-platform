import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";

export default function Challenges() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: challenges, isLoading, refetch } = useQuery<any[]>({ 
    queryKey: ["/api/challenges"],
    refetchInterval: 10000, // Recargar datos cada 10 segundos
    staleTime: 5000 // Considerar los datos obsoletos después de 5 segundos
  });
  
  // Recargar datos al montar el componente y cada vez que se regresa a esta página
  useEffect(() => {
    refetch();
  }, []);

  const { data: categories } = useQuery<any[]>({ 
    queryKey: ["/api/categories"] 
  });

  // Filter challenges based on search and category
  const filteredChallenges = challenges?.filter(challenge => {
    // Make sure challenge properties exist before using them
    const title = challenge.title || "";
    const description = challenge.description || "";
    const categoryName = challenge.category?.name || "Uncategorized";
    
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || 
                          categoryName.toLowerCase() === categoryFilter.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="text-text-secondary mt-1">Test your skills across various categories</p>
        </div>
        <button 
          onClick={() => refetch()} 
          className="mt-2 sm:mt-0 flex items-center text-accent-cyan hover:underline text-sm"
        >
          <Loader2 className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Challenges
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="w-full md:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-background-subtle text-text-primary border-background-subtle">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(category => (
                <SelectItem key={category.id} value={category.name.toLowerCase()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            type="search"
            placeholder="Search challenges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-[300px] bg-background-subtle text-text-primary border-background-subtle focus:border-accent-cyan"
          />
        </div>
      </div>

      {/* Challenge Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        </div>
      ) : filteredChallenges && filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChallenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              id={challenge.id}
              title={challenge.title || "Untitled Challenge"}
              description={challenge.description || "No description available"}
              points={challenge.points || 0}
              categoryName={challenge.category?.name || "Uncategorized"}
              categoryColor={challenge.category?.color || "#808080"}
              solved={challenge.solved || false}
              solves={challenge.solves || 0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-background-elevated rounded-lg border border-background-subtle">
          <p className="text-text-secondary">
            {searchQuery || categoryFilter !== "all"
              ? "No challenges match your filters. Try adjusting your search criteria."
              : "No challenges available yet."}
          </p>
        </div>
      )}
    </div>
  );
}
