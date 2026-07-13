import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      className={cn("nvion-shimmer rounded-md", className)}
      {...props} />)
  );
}

export { Skeleton }
