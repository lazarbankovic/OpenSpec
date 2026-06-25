workspace "Containers" "C2 - Container diagram" {

    model {
        # Define containers (applications, databases, etc.) inside your software system here
        # Example:
        # softwareSystem = softwareSystem "Software System" {
        #     webApp = container "Web Application" "Serves the frontend" "Node.js"
        #     database = container "Database" "Stores data" "PostgreSQL"
        #     webApp -> database "Reads from and writes to"
        # }
    }

    views {
        container softwareSystem "Containers" {
            include *
            autoLayout
        }

        theme default
    }

}
