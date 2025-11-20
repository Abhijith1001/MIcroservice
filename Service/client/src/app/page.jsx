import Pay from "@/components/Pay";
import { Minus } from "lucide-react";
import Image from "next/image";

const Page = () => {
  const cart = [
    {
      id: 1,
      name: "Nike Air Max",
      price: 129.9,
      image: "/product1.png",
      description:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    },
    {
      id: 2,
      name: "Adidas Superstar Cap",
      price: 29.9,
      image: "/product2.png",
      description:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    },
    {
      id: 3,
      name: "Puma Yellow T-Shirt",
      price: 49.9,
      image: "/product3.png",
      description:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    },
  ];
  return (
    <div className="mb-16">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">My Cart ({cart.length})</h1>
        <p className="text-sm text-gray-500">Free delivery on orders above $99</p>
      </div>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row">
        <div className="w-full space-y-4 lg:w-2/3">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(17,17,26,0.05)] md:flex-row"
            >
              <div className="flex items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-4">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={180}
                  height={180}
                  className="object-contain"
                  quality={100}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500 line-through opacity-0">$0</span>
                    <p className="text-xl font-semibold text-gray-900">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <button className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-gray-300">
                    Save for later
                  </button>
                  <button className="flex items-center gap-1 text-red-500 hover:text-red-600">
                    <Minus className="h-4 w-4" /> Remove
                  </button>
                  <span className="text-xs uppercase tracking-wide text-green-600">
                    7 days replacement policy
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full lg:w-1/3">
          <Pay cart={cart} />
        </div>
      </div>
    </div>
  );
};

export default Page;
