import Image from "next/image";

// A 16:9 image at the top of a card. The images vary in shape, so they fill and crop.
export default function CardImage({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    <div className="card-image">
      <Image src={src} alt={alt} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 280px" />
    </div>
  );
}
