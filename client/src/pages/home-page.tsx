import { Link, useLocation, useMatch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LogOut, MessageCircle, Plus } from "lucide-react";
import type { SelectProduct } from "@db/schema";

function formatQuantity(quantity: number): string {
  if (quantity >= 1) {
    return `${quantity.toFixed(1)} kg`;
  } else {
    return `${(quantity * 1000).toFixed(0)} g`;
  }
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === "farmer" ? "My Products" : "Available Products"}
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="outline" size="icon">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </Link>
            {user?.role === "farmer" && (
              <Link href="/products">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product) => (
            <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation(`/product?id=${product.id}`)}>
              <CardContent className="p-6">
                <div className="aspect-square rounded-lg bg-gray-100 mb-4">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-2xl font-bold">
                      ₹{Number(product.price).toFixed(2)}
                    </span>
                    <p className="text-sm text-gray-500">
                      Quantity: {formatQuantity(Number(product.quantity))}
                    </p>
                  </div>
                  {user?.role === "buyer" && (
                    <Button onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/chat?productId=${product.id}&farmerId=${product.farmerId}`);
                    }}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat with Farmer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}