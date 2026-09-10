import { Skeleton, SkeletonCard, SkeletonText } from "@/components/design-system/Skeleton";

export default function Loading() {
  return (
    <div className="w-full">
      <div className="w-full h-1 bg-muted relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary via-purple-500 to-accent animate-[shimmer_1.5s_ease-in-out_infinite]"
          style={{
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton variant="circle" className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton variant="text" className="h-4 w-40" />
            <Skeleton variant="text" className="h-3 w-24" />
          </div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
