workspace "Components" "C3 - Component diagram" {

    model {
        # Define components inside a container here
        # Example:
        # softwareSystem = softwareSystem "Software System" {
        #     webApp = container "Web Application" {
        #         router = component "Router" "Handles HTTP routing" "Express"
        #         controller = component "Controller" "Handles business logic"
        #         router -> controller "Delegates to"
        #     }
        # }
    }

    views {
        component webApp "Components" {
            include *
            autoLayout
        }

        theme default
    }

}
