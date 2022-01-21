import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    let newCart: Product[] = [];

    try {
      const addedProduct = cart.find(
        (cartProduct) => cartProduct.id === productId
      );
      const {
        data: { amount: productAmount },
      } = await api.get<Stock>(`/stock/${productId}`);

      if (addedProduct) {
        if (addedProduct.amount + 1 > productAmount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        newCart = cart.map((cartProduct) => {
          if (cartProduct.id === productId) {
            return { ...cartProduct, amount: cartProduct.amount + 1 };
          }

          return cartProduct;
        });
      } else {
        if (productAmount < 1) {
          toast.error("Quantidade solicitada fora de estoque");
        }

        const { data: product } = await api.get(`/products/${productId}`);

        newCart = [...cart, { ...product, amount: 1 }];
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const itemToRemove = cart.find(
        (cartProduct) => cartProduct.id === productId
      );

      if (!itemToRemove) {
        throw new Error();
      }

      const newCart = cart.filter(
        (cartProduct) => cartProduct.id !== productId
      );

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const itemToUpdate = cart.find(
        (cartProduct) => cartProduct.id === productId
      );

      if (!itemToUpdate) {
        throw new Error();
      }

      if (amount <= 0) {
        return;
      }

      const {
        data: { amount: productAmount },
      } = await api.get<Stock>(`/stock/${productId}`);

      if (amount > productAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((productItem) => {
        if (productItem.id === productId) {
          return { ...productItem, amount };
        }

        return productItem;
      });

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
