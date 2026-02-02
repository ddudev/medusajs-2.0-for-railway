import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MedusaCTA from "@modules/layout/components/medusa-cta"
import { QueryProvider } from "@lib/query/provider"
import { ToastContainer } from "@modules/common/components/toast-container"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <div className="w-full bg-white relative small:min-h-screen">
        <div className="h-16 bg-background-base border-b ">
          <nav className="flex h-full items-center content-container justify-between">
            <LocalizedClientLink
              href="/cart"
              className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
              data-testid="back-to-cart-link"
            >
              <ChevronDown className="rotate-90" size={16} />
              <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base ">
                Обратно към количка
              </span>
              <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
                Back
              </span>
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/"
              className="flex items-center text-ui-fg-subtle hover:opacity-80 transition-opacity"
              data-testid="store-link"
              aria-label="MS Store"
            >
              <svg
                className="h-8 w-auto"
                viewBox="0 0 1186 324"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path d="M1123.41 68.4003H1185.31V219.906C1185.31 290.016 1145.64 323.19 1076.55 323.19C1049.73 323.19 1023.89 318.524 1003.12 309.338C991.929 304.389 988.743 290.834 994.377 279.974C1001.51 266.232 1019.88 262.231 1034.55 267.163C1046.22 271.085 1058.97 273.258 1070.74 273.258C1105.62 273.258 1120.33 257.526 1120.33 228.456V222.3C1107.67 237.006 1088.86 244.188 1065.27 244.188C1016.02 244.188 974.294 209.304 974.294 154.584C974.294 100.206 1016.02 65.3223 1065.27 65.3223C1090.92 65.3223 1110.75 73.5303 1123.41 90.9723V68.4003ZM1080.66 192.546C1103.91 192.546 1121.01 177.156 1121.01 154.584C1121.01 132.012 1103.91 116.964 1080.66 116.964C1057.4 116.964 1039.96 132.012 1039.96 154.584C1039.96 177.156 1057.4 192.546 1080.66 192.546Z" fill="currentColor" />
                <path d="M864.747 65.322C915.021 65.322 955.719 101.916 955.719 160.74C955.719 219.906 915.021 256.842 864.747 256.842C840.465 256.842 822.339 250.002 810.027 235.296V253.764H748.125V32.49C748.125 14.5462 762.671 0 780.615 0C798.559 0 813.105 14.5463 813.105 32.49V84.474C825.759 71.478 843.201 65.322 864.747 65.322ZM851.067 205.2C872.955 205.2 890.055 189.126 890.055 160.74C890.055 132.696 872.955 116.964 851.067 116.964C829.179 116.964 812.079 132.696 812.079 160.74C812.079 189.126 829.179 205.2 851.067 205.2Z" fill="currentColor" />
                <path d="M678.63 256.842C656.742 256.842 639.642 240.768 639.642 218.196C639.642 194.94 656.742 179.892 678.63 179.892C700.86 179.892 717.618 194.94 717.618 218.196C717.618 240.768 700.86 256.842 678.63 256.842Z" fill="currentColor" />
                <path d="M530.723 205.2H595.703C609.113 205.2 619.985 216.071 619.985 229.482C619.985 242.892 609.113 253.764 595.703 253.764H476.87C461.469 253.764 448.985 241.279 448.985 225.879C448.985 219.16 451.411 212.667 455.817 207.594L534.827 116.622H475.49C462.174 116.622 451.379 105.827 451.379 92.5109C451.379 79.1948 462.174 68.3999 475.49 68.3999H588.929C604.192 68.3999 616.565 80.773 616.565 96.0361C616.565 102.695 614.16 109.13 609.794 114.158L530.723 205.2Z" fill="currentColor" />
                <path d="M430.271 161.424C430.271 166.212 429.587 172.368 429.245 177.498H294.497C299.969 196.308 316.043 207.252 339.983 207.252C348.225 207.252 355.194 206.192 361.533 204.006C374.749 199.45 390.327 199.076 400.016 209.153C409.555 219.073 409.988 235.141 398.22 242.278C382.334 251.911 362.351 256.842 337.931 256.842C271.925 256.842 229.175 216.144 229.175 160.74C229.175 104.994 272.609 65.3223 331.091 65.3223C385.811 65.3223 430.271 100.206 430.271 161.424ZM331.433 111.492C311.255 111.492 297.233 123.804 293.471 143.298H369.395C365.975 123.804 351.611 111.492 331.433 111.492Z" fill="currentColor" />
                <path d="M120.726 65.3223C164.16 65.3223 197.334 90.2883 197.334 147.744V221.274C197.334 239.218 182.788 253.764 164.844 253.764C146.9 253.764 132.354 239.218 132.354 221.274V158.346C132.354 131.67 120.726 120.384 101.916 120.384C81.054 120.384 64.98 133.38 64.98 164.16V221.274C64.98 239.218 50.4337 253.764 32.49 253.764C14.5463 253.764 0 239.218 0 221.274V68.4003H61.902V88.5783C76.608 73.1883 97.47 65.3223 120.726 65.3223Z" fill="currentColor" />
              </svg>
            </LocalizedClientLink>
            <div className="flex-1 basis-0" />
          </nav>
        </div>
        <div className="relative" data-testid="checkout-container">{children}</div>
        <div className="py-4 w-full flex items-center justify-center bg-background-base border-t border-border-base">
          <MedusaCTA />
        </div>
      </div>
      <ToastContainer />
    </QueryProvider>
  )
}
