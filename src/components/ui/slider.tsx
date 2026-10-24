import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "#/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-5 w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-foreground/[0.08] select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="h-full rounded-full bg-primary select-none"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative block size-4 shrink-0 cursor-grab rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ring-1 ring-black/10 transition-[box-shadow] select-none after:absolute after:-inset-2 hover:ring-4 hover:ring-foreground/10 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-foreground/15 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
