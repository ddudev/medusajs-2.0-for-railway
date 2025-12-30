import { HttpTypes } from "@medusajs/types"
import { FetchError } from "@medusajs/js-sdk"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { campaignsQueryKeys } from "./campaigns"

const PROMOTIONS_QUERY_KEY = "promotions" as const
export const promotionsQueryKeys = {
  ...queryKeysFactory(PROMOTIONS_QUERY_KEY),
  // TODO: handle invalidations properly
  listRules: (
    id: string | null,
    ruleType: string,
    query?: HttpTypes.AdminGetPromotionRuleParams
  ) => [PROMOTIONS_QUERY_KEY, id, ruleType, query],
  listRuleAttributes: (
    ruleType: string,
    promotionType?: string,
    applicationMethodTargetType?: string
  ) => [
    PROMOTIONS_QUERY_KEY,
    ruleType,
    promotionType,
    applicationMethodTargetType,
  ],
  listRuleValues: (
    ruleType: string,
    ruleValue: string,
    query: HttpTypes.AdminGetPromotionsRuleValueParams
  ) => [PROMOTIONS_QUERY_KEY, ruleType, ruleValue, query],
}

export const usePromotion = (
  id: string,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionResponse,
      FetchError,
      HttpTypes.AdminPromotionResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.detail(id),
    queryFn: async () => sdk.admin.promotion.retrieve(id),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRules = (
  id: string | null,
  ruleType: string,
  query?: HttpTypes.AdminGetPromotionRuleParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminGetPromotionRuleParams,
      FetchError,
      HttpTypes.AdminPromotionRuleListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRules(id, ruleType, query),
    queryFn: async () => sdk.admin.promotion.listRules(id, ruleType, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotions = (
  query?: HttpTypes.AdminGetPromotionsParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionListResponse,
      FetchError,
      HttpTypes.AdminPromotionListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.list(query),
    queryFn: async () => sdk.admin.promotion.list(query),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRuleAttributes = (
  ruleType: string,
  promotionType?: string,
  applicationMethodTargetType?: string,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminRuleAttributeOptionsListResponse,
      FetchError,
      HttpTypes.AdminRuleAttributeOptionsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleAttributes(
      ruleType,
      promotionType,
      applicationMethodTargetType
    ),
    queryFn: async () => {
      // First, try to get attributes from Medusa's built-in endpoint
      // Then merge in our custom attributes (subtotal, item_total)
      try {
        const medusaAttributes = await sdk.admin.promotion.listRuleAttributes(
          ruleType,
          promotionType,
          applicationMethodTargetType
        )

        // Add our custom attributes if they don't already exist
        const existingValues = new Set(
          (medusaAttributes?.attributes || []).map((attr: any) => attr.value)
        )

        const customAttributes = [
          {
            id: "subtotal",
            value: "subtotal",
            label: "Subtotal",
            field_type: "number",
            description: "Cart subtotal (items total before shipping and taxes)",
            operators: [
              { value: "gte", label: "Greater than or equal to" },
              { value: "gt", label: "Greater than" },
              { value: "lte", label: "Less than or equal to" },
              { value: "lt", label: "Less than" },
              { value: "eq", label: "Equal to" },
              { value: "ne", label: "Not equal to" },
            ],
          },
          {
            id: "item_total",
            value: "item_total",
            label: "Item Total",
            field_type: "number",
            description: "Total value of items in the cart",
            operators: [
              { value: "gte", label: "Greater than or equal to" },
              { value: "gt", label: "Greater than" },
              { value: "lte", label: "Less than or equal to" },
              { value: "lt", label: "Less than" },
              { value: "eq", label: "Equal to" },
              { value: "ne", label: "Not equal to" },
            ],
          },
        ]

        // Only add custom attributes if they're not already present
        const newAttributes = customAttributes.filter(
          (attr) => !existingValues.has(attr.value)
        )

        return {
          ...medusaAttributes,
          attributes: [
            ...(medusaAttributes?.attributes || []),
            ...newAttributes,
          ],
        }
      } catch (error) {
        // If Medusa's endpoint fails, try our custom endpoint as fallback
        const backendUrl = sdk.config.baseUrl || "/"
        const queryParams = new URLSearchParams({
          rule_type: ruleType,
          ...(promotionType && { promotion_type: promotionType }),
          ...(applicationMethodTargetType && {
            application_method_target_type: applicationMethodTargetType,
          }),
        })

        const baseUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl
        const url = `${baseUrl}/admin/promotions/rules/attributes?${queryParams.toString()}`

        const response = await fetch(url, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch rule attributes: ${response.statusText}`)
        }

        return await response.json()
      }
    },
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRuleValues = (
  ruleType: string,
  ruleValue: string,
  query?: HttpTypes.AdminGetPromotionsRuleValueParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminRuleValueOptionsListResponse,
      FetchError,
      HttpTypes.AdminRuleValueOptionsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleValues(
      ruleType,
      ruleValue,
      query || {}
    ),
    queryFn: async () =>
      sdk.admin.promotion.listRuleValues(ruleType, ruleValue, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useDeletePromotion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.DeleteResponse<"promotion">,
    FetchError,
    void
  >
) => {
  return useMutation({
    mutationFn: () => sdk.admin.promotion.delete(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: promotionsQueryKeys.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCreatePromotion = (
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.AdminCreatePromotion
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.promotion.create(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: campaignsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdatePromotion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.AdminUpdatePromotion
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.promotion.update(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionAddRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchAddPromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.addRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      // Invalidate all promotion queries
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })
      // Specifically invalidate the rules list for this promotion and rule type
      queryClient.invalidateQueries({ 
        queryKey: promotionsQueryKeys.listRules(id, ruleType) 
      })
      // Also invalidate the promotion detail to refresh the full promotion object
      queryClient.invalidateQueries({ 
        queryKey: promotionsQueryKeys.detail(id) 
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionRemoveRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchRemovePromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.removeRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionUpdateRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchUpdatePromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.updateRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
