import { Proveedor } from "@repo/common/types"
import { useQuery } from "@tanstack/react-query"

export const useProveedores = () => {
    const { data: providers = [], isLoading: isLoadingProviders, error } = useQuery<Proveedor[]>({
        queryKey: ["providers"],
        queryFn: async () => {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"
            const url = `${baseUrl}/proveedores`
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error("Network response was not ok")
            }
            return response.json()
        }
    })

    return {
        providers,
        isLoadingProviders,
        error
    }
}