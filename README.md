Hola!

Este es un pequeño proyecto elaborado con nodejs en Express para simular un sistema de préstamos en una librería.

El archivo library-example.sql incluye un script ejecutable en una base de datos de MySQL para la utilización de esta api REST.

Las rutas funcionales son las siguientes (Aclaración, se usa localhost y el puerto 3000 para tu prueba):

1. Books:
Rutas GET:
-GET http://localhost:3000/api/books
-GET http://localhost:3000/api/books/1

Rutas POST:
-POST http://localhost:3000/api/books
(ejemplo de json para la ruta)
{
  "title": "El Quijote",
  "author": "Cervantes",
  "isbn": "9781234567890",
  "category": "Clásico",
  "total_copies": 3,
  "publication_year": 1605
}
-POST http://localhost:3000/api/books/search
(ejemplo de json para la ruta)
{
  "search": "García"
}

Rutas PUT:
-PUT http://localhost:3000/api/books/1
(ejemplo de json para la ruta)
{
  "total_copies": 10,
  "available_copies": 8
}
(ejemplo 2 de json para la ruta)
{
  "title": "Cien años de soledad - Edición especial",
  "total_copies": 10,
  "available_copies": 8,
  "category": "Ficción Latinoamericana"
}

2. Users
Rutas GET:
-GET http://localhost:3000/api/users
-GET http://localhost:3000/api/users/2

Rutas POST:
-POST http://localhost:3000/api/users
(ejemplo de json para la ruta)
{
  "full_name": "Pedro Sánchez",
  "email": "pedro.sanchez@email.com",
  "phone": "555-0106",
  "address": "Av. La Marina 999"
}
Rutas DELETE:
-DELETE http://localhost:3000/api/users/6/deactivate

3. Loans (Préstamos)
Rutas GET:
-GET http://localhost:3000/api/loans?status=active
-GET http://localhost:3000/api/loans/1

Rutas POST
-POST http://localhost:3000/api/loans
(ejemplo de json para la ruta)
{
  "user_id": 1,
  "book_id": 4,
  "loan_days": 14
}
-POST http://localhost:3000/api/loans/1/return (devolver un libro prestado)

