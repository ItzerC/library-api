# 📚 Sistema de Préstamos de Librería (Express & MySQL)

Hecho por: Cristian Axel Palante Litano
E_mail: e_2021101381f@uncp.edu.pe

Este es un pequeño proyecto elaborado con **Node.js en Express** para simular un sistema de préstamos en una librería.

El archivo `library-example.sql` incluye un script ejecutable en una base de datos de MySQL para la utilización de esta API REST.

---

## 🚦 Rutas Funcionales de la API

**Aclaración:** Para tu prueba, se usa `http://localhost:3000` como base.

### 1. Libros (`/api/books`)

#### Rutas GET
* **Listar todos:** `GET http://localhost:3000/api/books`
* **Obtener por ID:** `GET http://localhost:3000/api/books/1`

#### Rutas POST
* **Crear un nuevo libro:** `POST http://localhost:3000/api/books`
    ```json
    {
      "title": "El Quijote",
      "author": "Cervantes",
      "isbn": "9781234567890",
      "category": "Clásico",
      "total_copies": 3,
      "publication_year": 1605
    }
    ```
* **Buscar por texto:** `POST http://localhost:3000/api/books/search`
    ```json
    {
      "search": "García"
    }
    ```

#### Rutas PUT
* **Actualizar libro por ID:** `PUT http://localhost:3000/api/books/1`
    *(Puedes enviar solo los campos que deseas actualizar.)*
    ```json
    {
      "total_copies": 10,
      "available_copies": 8
    }
    ```
    o
    ```json
    {
      "title": "Cien años de soledad - Edición especial",
      "total_copies": 10,
      "available_copies": 8,
      "category": "Ficción Latinoamericana"
    }
    ```

### 2. Usuarios (`/api/users`)

#### Rutas GET
* **Listar todos:** `GET http://localhost:3000/api/users`
* **Obtener por ID:** `GET http://localhost:3000/api/users/2`

#### Rutas POST
* **Crear un nuevo usuario:** `POST http://localhost:3000/api/users`
    ```json
    {
      "full_name": "Pedro Sánchez",
      "email": "pedro.sanchez@email.com",
      "phone": "555-0106",
      "address": "Av. La Marina 999"
    }
    ```

#### Rutas DELETE
* **Desactivar usuario por ID:** `DELETE http://localhost:3000/api/users/6/deactivate`

### 3. Préstamos (`/api/loans`)

#### Rutas GET
* **Listar activos (o todos):** `GET http://localhost:3000/api/loans?status=active`
* **Obtener por ID:** `GET http://localhost:3000/api/loans/1`

#### Rutas POST
* **Realizar un nuevo préstamo:** `POST http://localhost:3000/api/loans`
    ```json
    {
      "user_id": 1,
      "book_id": 4,
      "loan_days": 14
    }
    ```
* **Devolver un libro prestado:** `POST http://localhost:3000/api/loans/1/return`
