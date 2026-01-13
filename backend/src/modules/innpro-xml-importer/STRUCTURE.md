# InnPro XML Product Structure Documentation

This document describes the complete structure of products in the InnPro XML feed, verified across multiple products.

## Product Identification & Metadata

### Required Fields
- **`product.@attributes.id`** (string)
  - Product ID from XML (used for matching existing products)
  - Example: `"4145"`, `"19894"`
  - Import: Store as `metadata.external_id`

- **`product.@attributes.currency`** (string)
  - Currency code for pricing
  - Example: `"EUR"`
  - Import: Use for price `currency_code`

- **`product.@attributes.type`** (string)
  - Product type
  - Example: `"regular"`
  - Import: Store in `metadata.product_type`

- **`product.@attributes.vat`** (string)
  - VAT rate as percentage
  - Example: `"23.0"`
  - Import: Store in `metadata.vat_rate`

- **`product.@attributes.site`** (string)
  - Site ID
  - Example: `"7"`
  - Import: Store in `metadata.site_id`

### Optional Fields
- **`product.@attributes.code_on_card`** (string, optional)
  - Code on card
  - Example: `"008177"`, `"026043"`
  - Import: Store in `metadata.code_on_card`

- **`product.@attributes.producer_code_standard`** (string, optional)
  - Producer code standard
  - Example: `"OTHER"`
  - Import: Store in `metadata.producer_code_standard`

## Producer Information

- **`product.producer.id`** (string)
  - Producer ID
  - Example: `"1424715686"`, `"1597834832"`
  - Import: Store in `metadata.producer_id`

- **`product.producer.name`** (string)
  - Producer name
  - Example: `"SkyRC"`, `"ECOFLOW"`
  - Import: Map to Medusa brand (create if missing)

## Category Information

- **`product.category.id`** (string)
  - Category ID
  - Example: `"1214555927"`, `"1214555755"`
  - Import: Store in `metadata.category_id`

- **`product.category.name`** (string)
  - Category name (hierarchical path)
  - Example: `"RC models/Charging/Chargers"`, `"Energy/Power stations/Accessories"`
  - Import: Map to Medusa product category (create hierarchy if needed)

## Unit Information

- **`product.unit.id`** (string)
  - Unit ID
  - Example: `"0"`
  - Import: Store in `metadata.unit_id`

- **`product.unit.name`** (string)
  - Unit name
  - Example: `"pcs."`
  - Import: Store in `metadata.unit_name`

## Warranty Information

- **`product.warranty.id`** (string)
  - Warranty ID
  - Example: `"2"`
  - Import: Store in `metadata.warranty_id`

- **`product.warranty.type`** (string)
  - Warranty type
  - Example: `"producer"`
  - Import: Store in `metadata.warranty_type`

- **`product.warranty.period`** (string)
  - Warranty period in months
  - Example: `"12"`
  - Import: Store in `metadata.warranty_period`

- **`product.warranty.name`** (string)
  - Warranty name/description
  - Example: `"12 miesięcy"`
  - Import: Store in `metadata.warranty_name`

## Product Card/URL

- **`product.card.url`** (string)
  - Product card URL
  - Example: `"https://b2b.innpro.eu/product-eng-4145-..."`
  - Import: Store in `metadata.source_url` or `metadata.card_url`

## Description (Multilingual - Always Array)

### Name
- **`product.description.name[]`** (array)
  - Array of name objects with language attributes
  - Each item has:
    - `@attributes.{xml}lang` (string) - Language code (e.g., `"eng"`, `"pol"`)
    - `@text` (string) - Product name in that language
  - Example:
    ```json
    [
      {
        "@attributes": { "{http://www.w3.org/XML/1998/namespace}lang": "eng" },
        "@text": "Charger SkyRC iMax B6AC V2"
      },
      {
        "@attributes": { "{http://www.w3.org/XML/1998/namespace}lang": "pol" },
        "@text": "Ładowarka SkyRC iMax B6AC V2"
      }
    ]
    ```
  - Import: Extract by language, use as `title` per locale

### Long Description
- **`product.description.long_desc[]`** (array)
  - Array of description objects with language attributes
  - Each item has:
    - `@attributes.{xml}lang` (string) - Language code
    - `@text` (string) - HTML description in that language
  - Import: Extract by language, use as `description` per locale (HTML content)

## Images (Can Be Single Object OR Array)

**Important**: Image fields can be either a single object or an array. Always check and handle both cases.

### Large Images
- **`product.images.large.image`** (object OR array)
  - Single image object OR array of image objects
  - Each image has:
    - `url` (string) - Image URL
    - `priority` (string) - Priority/order (e.g., `"1"`, `"2"`)
    - `height` (string) - Image height
    - `width` (string) - Image width
    - `hash` (string) - Image hash
    - `changed` (string) - Last changed timestamp
    - `key` (string) - Image key
  - Import: Use `url` from each image, order by `priority` attribute

### Original Images
- **`product.images.originals.image`** (object OR array)
  - High-resolution original images
  - Same structure as large images
  - Import: Use as high-res fallback

### Medium Images
- **`product.images.medium.image`** (object OR array)
  - Medium-sized images
  - Same structure as large images
  - Import: Use as medium images

### Small Images
- **`product.images.small.image`** (object OR array)
  - Small/thumbnail images
  - Same structure as large images
  - Import: Use as thumbnails

### Icons
- **`product.images.icons.icon`** (object, always single)
  - Icon/thumbnail image
  - Same structure as other images
  - Additional fields:
    - `url_originals` (string) - Original icon URL
    - `key_originals` (string) - Original icon key
    - `url_small` (string) - Small icon URL
    - `key_small` (string) - Small icon key
    - `height_small` (string) - Small icon height
    - `width_small` (string) - Small icon width
  - Import: Use as icon/thumbnail

## Attachments/Files (Can Be Single Object OR Array)

- **`product.attachments.file`** (object OR array)
  - Single file object OR array of file objects
  - Each file has:
    - `@attributes.url` (string) - File download URL
    - `@attributes.attachment_file_type` (string) - File type (e.g., `"doc"`)
    - `@attributes.attachment_file_extension` (string) - File extension (e.g., `"pdf"`)
    - `@attributes.priority` (string) - Priority
    - `@attributes.version` (string) - Version (e.g., `"full"`)
    - `@attributes.enable` (string) - Enable flag
    - `@attributes.download_log` (string) - Download log flag
    - `name` (object) - Multilingual name
      - `@attributes.{xml}lang` (string) - Language code
      - `@text` (string) - File name in that language
    - `document_types` (object, optional) - Document type information
      - `document_type` (object)
        - `@attributes.type` (string) - Document type (e.g., `"instruction_with_safety_information"`)
        - `description` (object) - Description
  - Import: Store in `metadata.attachments` JSON array

## Parameters (Always Array)

- **`product.parameters.parameter[]`** (array)
  - Array of parameter objects (product specifications)
  - Each parameter has:
    - `@attributes.type` (string) - Always `"parameter"`
    - `@attributes.id` (string) - Parameter ID
    - `@attributes.name` (string) - Parameter name (e.g., `"Charging power (W)"`, `"Net weight"`)
    - `@attributes.priority` (string) - Priority number
    - `@attributes.distinction` (string) - Distinction flag (`"y"` or `"n"`)
    - `@attributes.group_distinction` (string) - Group distinction flag
    - `@attributes.hide` (string) - Hide flag (`"y"` or `"n"`) - determines if shown in frontend
    - `@attributes.auction_template_hide` (string) - Auction template hide flag
    - `@attributes.context_id` (string, optional) - Context ID (e.g., `"CONTEXT_SAFETY_STATEMENT"`, `"CONTEXT_MIN_QUANTITY_PER_WHOLESALE_ORDER"`)
    - `value` (object OR array) - Parameter value(s)
      - If single value: object with `id`, `priority`, `name`
      - If multiple values: array of value objects
      - Each value has:
        - `id` (string) - Value ID
        - `priority` (string) - Priority
        - `name` (string) - Actual value (e.g., `"50"`, `"LiPo"`, `"LiFe"`)
        - `context_id` (string, optional) - Context ID

  Import strategy:
  - Store as `metadata.parameters` JSON array
  - Or parse into individual `metadata` keys (e.g., `metadata.charging_power_w = "50"`)
  - Handle multi-value parameters (e.g., `Acumulator Type` = `["LiPo", "LiFe", "Inny"]`)
  - Use `hide="n"` to determine which to show in frontend

## Sizes/Variants (Can Be Single Object OR Array)

**Important**: Size field can be either a single object or an array. Always check and handle both cases.

- **`product.sizes.size`** (object OR array)
  - Single size object OR array of size objects
  - If array: create multiple variants
  - If single: create one variant

### Size Attributes
- **`product.sizes.size.@attributes.id`** (string)
  - Size ID
  - Example: `"uniw"`
  - Import: Use as variant ID or store in `metadata.size_id`

- **`product.sizes.size.@attributes.name`** (string)
  - Size name
  - Example: `"universal"`
  - Import: Use as variant title or option value

- **`product.sizes.size.@attributes.panel_name`** (string)
  - Panel name
  - Example: `"uniw"`
  - Import: Store in `metadata.panel_name`

- **`product.sizes.size.@attributes.code`** (string)
  - Size code
  - Example: `"4145-uniw"`, `"19894-uniw"`
  - Import: Use as variant handle or store in `metadata.size_code`

- **`product.sizes.size.@attributes.weight`** (string)
  - Weight
  - Example: `"1030"`, `"500"`
  - Import: Store in variant `metadata.weight` or `weight` field

- **`product.sizes.size.@attributes.{iaiext}weight_net`** (string)
  - Net weight
  - Example: `"990"`, `"0"`
  - Import: Store in `metadata.weight_net`

- **`product.sizes.size.@attributes.code_producer`** (string, optional)
  - Producer code (SKU)
  - Example: `"SK-100008-11"`
  - Import: Use as variant `sku` if present

- **`product.sizes.size.@attributes.{iaiext}code_external`** (string)
  - External code (EAN/barcode) - **ALWAYS PRESENT**
  - Example: `"6930460000040"`, `"4897082661290"`
  - Import: Use as variant `barcode` or `ean`

- **`product.sizes.size.@attributes.{iaiext}priority`** (string)
  - Priority
  - Example: `"0"`
  - Import: Store in `metadata.priority`

### Size-Level Pricing (Always Present)
- **`product.sizes.size.price.net`** (string)
  - Net price - **PRIMARY SOURCE FOR PRICING**
  - Example: `"49.59"`, `"26.02"`
  - Import: Use as variant price amount (net)

- **`product.sizes.size.price.gross`** (string)
  - Gross price - **PRIMARY SOURCE FOR PRICING**
  - Example: `"61"`, `"32"`
  - Import: Use as variant price amount (gross)

- **`product.sizes.size.srp.net`** (string)
  - Suggested retail price (net)
  - Example: `"49.59"`, `"26.02"`
  - Import: Store in `metadata.srp_net`

- **`product.sizes.size.srp.gross`** (string)
  - Suggested retail price (gross)
  - Example: `"61"`, `"32"`
  - Import: Store in `metadata.srp_gross`

### Size-Level Stock/Inventory (Always Present)
- **`product.sizes.size.stock.id`** (string)
  - Stock location ID
  - Example: `"1"`
  - Import: Store as inventory location ID

- **`product.sizes.size.stock.quantity`** (string)
  - Stock quantity - **PRIMARY SOURCE FOR INVENTORY**
  - Example: `"78"`, `"26"`
  - Import: Use as inventory `stocked_quantity`

- **`product.sizes.size.stock.available_stock_quantity`** (string)
  - Available stock quantity
  - Example: `"78"`, `"26"`
  - Import: Use as inventory `available_quantity`

- **`product.sizes.size.stock.stock_quantity`** (string)
  - Stock quantity (decimal format)
  - Example: `"78.000"`, `"26.000"`
  - Import: Use as inventory `stocked_quantity` (decimal)

## Product-Level Pricing (Fallback)

- **`product.price.net`** (string)
  - Product-level net price
  - Example: `"49.59"`, `"26.02"`
  - Import: Use if size-level price missing

- **`product.price.gross`** (string)
  - Product-level gross price
  - Example: `"61"`, `"32"`
  - Import: Use if size-level price missing

- **`product.srp.net`** (string)
  - Product-level suggested retail price (net)
  - Example: `"49.59"`, `"26.02"`
  - Import: Store in `metadata.srp_net`

- **`product.srp.gross`** (string)
  - Product-level suggested retail price (gross)
  - Example: `"61"`, `"32"`
  - Import: Store in `metadata.srp_gross`

## Dynamic Pricing

- **`product.price_retail_dynamic.site.id`** (string)
  - Site ID
  - Example: `"7"`
  - Import: Store in `metadata.price_retail_dynamic` JSON

- **`product.price_retail_dynamic.site.size_id`** (string)
  - Size ID
  - Example: `"0"`
  - Import: Store in `metadata.price_retail_dynamic` JSON

- **`product.price_retail_dynamic.site.gross`** (string)
  - Gross price
  - Example: `"0"`
  - Import: Store in `metadata.price_retail_dynamic` JSON

- **`product.price_retail_dynamic.site.net`** (string)
  - Net price
  - Example: `"0"`
  - Import: Store in `metadata.price_retail_dynamic` JSON

## Omnibus Pricing

- **`product.omnibus_price_retail.site.id`** (string)
  - Site ID
  - Example: `"7"`
  - Import: Store in `metadata.omnibus_price_retail` JSON

- **`product.omnibus_price_retail.site.size_id`** (string)
  - Size ID
  - Example: `"0"`
  - Import: Store in `metadata.omnibus_price_retail` JSON

- **`product.omnibus_price_retail.site.gross`** (string)
  - Gross price
  - Example: `"65.5"`, `"28"`
  - Import: Store in `metadata.omnibus_price_retail` JSON

- **`product.omnibus_price_retail.site.net`** (string)
  - Net price
  - Example: `"53.25"`, `"22.76"`
  - Import: Store in `metadata.omnibus_price_retail` JSON

- **`product.omnibus_price_retail.site.new_price`** (string)
  - New price flag
  - Example: `"false"`
  - Import: Store in `metadata.omnibus_price_retail` JSON

- **`product.omnibus_price_wholesale.site.*`** (same structure as retail)
  - Import: Store in `metadata.omnibus_price_wholesale` JSON

## Sell By Quantities

- **`product.sell_by.retail.quantity`** (string)
  - Minimum quantity for retail
  - Example: `"1"`
  - Import: Store in `metadata.min_quantity_retail`

- **`product.sell_by.wholesale.quantity`** (string)
  - Minimum quantity for wholesale
  - Example: `"1"`
  - Import: Store in `metadata.min_quantity_wholesale`

## Inwrapper

- **`product.inwrapper.quantity`** (string)
  - Inwrapper quantity
  - Example: `"1"`
  - Import: Store in `metadata.inwrapper_quantity`

## Subscriptions Settings

- **`product.subscriptions_settings.site.@attributes.id`** (string)
  - Site ID (often empty)
  - Example: `""`
  - Import: Store in `metadata.subscriptions_settings` JSON

- **`product.subscriptions_settings.site.@attributes.enabled`** (string)
  - Enabled flag
  - Example: `"false"`
  - Import: Store in `metadata.subscriptions_settings` JSON

- **`product.subscriptions_settings.site.@attributes.units_number_retail`** (string)
  - Units number for retail
  - Example: `""`
  - Import: Store in `metadata.subscriptions_settings` JSON

- **`product.subscriptions_settings.site.@attributes.units_number_wholesale`** (string)
  - Units number for wholesale
  - Example: `""`
  - Import: Store in `metadata.subscriptions_settings` JSON

## Responsible Entity

### Producer
- **`product.responsible_entity.producer.@attributes.id`** (string)
  - Producer ID
  - Example: `"167"`, `"173"`
  - Import: Store in `metadata.responsible_producer` JSON

- **`product.responsible_entity.producer.code`** (string)
  - Producer code
  - Example: `"SkyRC"`, `"EcoFlow"`
  - Import: Store in `metadata.responsible_producer` JSON

- **`product.responsible_entity.producer.name`** (string)
  - Producer name
  - Example: `"SkyRC Technology Co., Ltd."`, `"EcoFlow Inc."`
  - Import: Store in `metadata.responsible_producer` JSON

- **`product.responsible_entity.producer.mail`** (string)
  - Producer email
  - Example: `"support@skyrc.com"`, `"support.en@ecoflow.com"`
  - Import: Store in `metadata.responsible_producer` JSON

- **`product.responsible_entity.producer.country`** (string)
  - Producer country code
  - Example: `"CN"`
  - Import: Store in `metadata.responsible_producer` JSON

- **`product.responsible_entity.producer.city`** (string)
  - Producer city
  - Example: `"Shenzhen"`
  - Import: Store in `metadata.responsible_producer` JSON

- **`product.responsible_entity.producer.zipcode`** (string)
  - Producer zipcode
  - Example: `"518110"`, `"518100"`
  - Import: Store in `metadata.responsible_producer` JSON

- **`product.responsible_entity.producer.street`** (string)
  - Producer street
  - Example: `"Guanguang South"`, `"Fuyuanyi"`
  - Import: Store in `metadata.responsible_producer` JSON

- **`product.responsible_entity.producer.number`** (string)
  - Producer street number
  - Example: `"4"`, `"1"`
  - Import: Store in `metadata.responsible_producer` JSON

### Persons
- **`product.responsible_entity.persons.person`** (object, always single)
  - Similar structure to producer
  - Import: Store in `metadata.responsible_persons` JSON

## Services Descriptions

- **`product.services_descriptions`** (object)
  - Usually empty `{}`
  - Import: Store in `metadata.services_descriptions` if populated

## Key Findings & Important Notes

### 1. Arrays vs Single Objects
- **Images**: Can be single object OR array - always check and handle both
- **Attachments**: Can be single object OR array - always check and handle both
- **Sizes**: Can be single object OR array - always check and handle both
- **Parameters**: Always array
- **Description name/long_desc**: Always array

### 2. Optional Fields
- `producer_code_standard` - may be missing
- `code_producer` (SKU) - may be missing, but `code_external` (EAN) is always present

### 3. Always Present Fields
- `id` - Product ID (required for matching)
- `currency` - Currency code
- `price` - Pricing information
- `stock` - Stock/inventory information
- `code_external` (EAN/barcode) - Always present in size attributes

### 4. Multilingual Fields
- `description.name` - Always array with language attributes
- `description.long_desc` - Always array with language attributes
- `attachments.file[].name` - Multilingual file names

### 5. Primary Data Sources
- **Pricing**: Use `product.sizes.size.price.net` or `gross` (size-level) as primary, fallback to `product.price.*`
- **Inventory**: Use `product.sizes.size.stock.quantity` as primary source
- **SKU**: Use `product.sizes.size.@attributes.code_producer` if present, otherwise use `code_external` as fallback
- **EAN/Barcode**: Always use `product.sizes.size.@attributes.{iaiext}code_external`

### 6. Namespace Handling
- XML namespace attributes use format: `{http://www.iai-shop.com/developers/iof/extensions.phtml}field_name`
- XML lang attributes use format: `{http://www.w3.org/XML/1998/namespace}lang`
- When parsing, these need to be handled properly (either preserve namespace or extract field name)

## Import Strategy Summary

### Core Product Mapping
```typescript
{
  title: extractByLang(product.description.name, "eng"),
  handle: sanitize(product.@attributes.id),
  metadata: {
    external_id: product.@attributes.id, // REQUIRED for matching
    currency: product.@attributes.currency,
    // ... other metadata fields
  },
  images: extractImages(product.images), // Handle both single and array
  variants: extractVariants(product.sizes.size), // Handle both single and array
}
```

### Helper Functions Needed

#### Image Extraction (Handle Both Cases)
```typescript
function extractImages(images: any): Array<{url: string}> {
  const imageList = []
  
  // Large images (can be single or array)
  const large = Array.isArray(images.large?.image) 
    ? images.large.image 
    : (images.large?.image ? [images.large.image] : [])
  
  // Sort by priority and extract URLs
  large.sort((a, b) => (parseInt(a.priority || "0")) - (parseInt(b.priority || "0")))
  imageList.push(...large.map(img => ({ url: img.url })))
  
  return imageList
}
```

#### Variant Extraction (Handle Both Cases)
```typescript
function extractVariants(size: any): Array<any> {
  const sizes = Array.isArray(size) ? size : (size ? [size] : [])
  
  return sizes.map(s => ({
    title: s.@attributes.name || "Default",
    sku: s.@attributes.code_producer || undefined, // optional
    barcode: s.@attributes.{iaiext}code_external, // always present
    prices: [{
      amount: parseFloat(s.price.net || s.price.gross),
      currency_code: product.@attributes.currency
    }],
    inventory_quantity: parseInt(s.stock.quantity),
    metadata: {
      size_id: s.@attributes.id,
      weight: s.@attributes.weight,
      // ... other size metadata
    }
  }))
}
```

#### Multilingual Extraction
```typescript
function extractByLang(items: Array<any>, lang: string): string | undefined {
  const langMap = { "eng": "eng", "pol": "pol", "hun": "hun" }
  const targetLang = langMap[lang] || lang
  
  const item = items.find(i => 
    i["@attributes"]?.["{http://www.w3.org/XML/1998/namespace}lang"] === targetLang
  )
  
  return item?.["@text"]
}
```

## Verification Status

✅ Verified across 2 products:
- Product ID: 4145 (SkyRC Charger)
- Product ID: 19894 (EcoFlow Cable)

Both products follow the same structure with noted variations (arrays vs single objects, optional fields).
