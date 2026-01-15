"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "day" | "week" | "month" | "year" | null;
  intervalCount?: number;
  features: string[];
  popular?: boolean;
  stripePriceId: string;
  productName?: string;
}

interface PricingCardProps {
  plan: PricingPlan;
  isLoggedIn: boolean;
  currentPlanId?: string;
}

export function PricingCard({
  plan,
  isLoggedIn,
  currentPlanId,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isCurrentPlan = currentPlanId === plan.id;

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      window.location.href = `/sign-in?redirect=/pricing`;
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const getIntervalLabel = () => {
    if (!plan.interval) return "";
    if (plan.intervalCount && plan.intervalCount > 1) {
      return `/${plan.intervalCount} ${plan.interval}s`;
    }
    return `/${plan.interval}`;
  };

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all hover:shadow-lg",
        plan.popular && "border-primary scale-[1.02] shadow-md"
      )}
    >
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">
            {formatPrice(plan.price, plan.currency)}
          </span>
          <span className="text-muted-foreground">{getIntervalLabel()}</span>
        </div>
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="text-primary h-5 w-5 shrink-0" />
              <span className="text-muted-foreground text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={plan.popular ? "default" : "outline"}
          size="lg"
          onClick={handleSubscribe}
          disabled={isLoading || isCurrentPlan}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : (
            "Get Started"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface PricingGridProps {
  plans: PricingPlan[];
  isLoggedIn: boolean;
  currentPlanId?: string;
}

export function PricingGrid({
  plans,
  isLoggedIn,
  currentPlanId,
}: PricingGridProps) {
  return (
    <div
      className={cn(
        "grid gap-6",
        plans.length === 1 && "mx-auto max-w-md",
        plans.length === 2 && "mx-auto max-w-3xl md:grid-cols-2",
        plans.length >= 3 && "md:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          isLoggedIn={isLoggedIn}
          currentPlanId={currentPlanId}
        />
      ))}
    </div>
  );
}
