import { BlockMath, InlineMath } from "react-katex";

interface Props {
  text: string;
}

export default function MathRenderer({ text }: Props) {
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;

  const parts = text.split(blockRegex);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <BlockMath key={index}>{part}</BlockMath>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}