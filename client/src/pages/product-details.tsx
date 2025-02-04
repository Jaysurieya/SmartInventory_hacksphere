import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import type { SelectProduct } from "@db/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatQuantity(quantity: number): string {
  if (quantity >= 1) {
    return `${quantity.toFixed(1)} kg`;
  } else {
    return `${(quantity * 1000).toFixed(0)} g`;
  }
}

export default function ProductDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const productId = searchParams.get('id');

  const { data: product, isLoading } = useQuery<SelectProduct & { farmer: { username: string } }>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chats", {
        farmerId: product?.farmerId,
        productId: product?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      setLocation("/chat");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!productId) {
    setLocation("/");
    return null;
  }

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full rounded-lg object-cover aspect-square"
                  />
                ) : (
                  <div className="w-full rounded-lg bg-gray-100 aspect-square flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">Product Details</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Category</dt>
                      <dd>{product.category}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Price</dt>
                      <dd className="text-2xl font-bold">₹{Number(product.price).toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Available Quantity</dt>
                      <dd>{formatQuantity(Number(product.quantity))}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Location</dt>
                      <dd>{product.location}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold text-lg">Seller Information</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">Farmer Name</dt>
                      <dd>{product.farmer.username}</dd>
                    </div>
                  </dl>
                </div>

                {user?.role === "buyer" && (
                  <Button
                    className="w-full"
                    onClick={() => createChatMutation.mutate()}
                    disabled={createChatMutation.isPending}
                  >
                    {createChatMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MessageCircle className="h-4 w-4 mr-2" />
                    )}
                    Contact Seller
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}