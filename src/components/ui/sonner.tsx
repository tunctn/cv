import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = (props: ToasterProps) => (
	<Sonner
		theme="light"
		className="toaster group"
		toastOptions={{
			classNames: {
				toast: "!rounded-2xl !border-border !shadow-lg !font-sans",
			},
		}}
		{...props}
	/>
);

export { Toaster };
