workspace "Code" "C4 - Code diagram" {

    model {
        # Define code-level elements (classes, interfaces) here
        # This level is rarely needed — use only when class/function-level
        # design is explicitly part of the architectural decision.
        # Example:
        # softwareSystem = softwareSystem "Software System" {
        #     webApp = container "Web Application" {
        #         controller = component "Controller" {
        #             serviceClass = codeElement "OrderService" "Handles order logic"
        #         }
        #     }
        # }
    }

    views {
        theme default
    }

}
