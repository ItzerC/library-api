-- ============================================
-- SISTEMA DE GESTIÓN DE BIBLIOTECA
-- Base de datos completa con procedures y triggers
-- ============================================

-- Crear base de datos
DROP DATABASE IF EXISTS library_db;
CREATE DATABASE library_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE library_db;

-- ============================================
-- TABLAS
-- ============================================

-- Tabla de libros
CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(150) NOT NULL,
    isbn VARCHAR(13) UNIQUE NOT NULL,
    category VARCHAR(50),
    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    publication_year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_title (title),
    INDEX idx_author (author),
    INDEX idx_isbn (isbn)
);

-- Tabla de usuarios
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    registration_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    total_fines DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Tabla de préstamos
CREATE TABLE loans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    loan_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('active', 'returned', 'overdue') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id),
    INDEX idx_user_id (user_id),
    INDEX idx_book_id (book_id),
    INDEX idx_status (status)
);

-- Tabla de historial de movimientos
CREATE TABLE loan_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    loan_id INT NOT NULL,
    action_type ENUM('loan_created', 'book_returned', 'fine_applied') NOT NULL,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (loan_id) REFERENCES loans(id),
    INDEX idx_loan_id (loan_id),
    INDEX idx_action_date (action_date)
);

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Procedure: Registrar un nuevo préstamo
DELIMITER //
CREATE PROCEDURE sp_create_loan(
    IN p_user_id INT,
    IN p_book_id INT,
    IN p_loan_days INT
)
BEGIN
    DECLARE v_available_copies INT;
    DECLARE v_active_loans INT;
    DECLARE v_loan_id INT;
    DECLARE v_due_date DATE;
    
    -- Iniciar transacción
    START TRANSACTION;
    
    -- Verificar si el libro tiene copias disponibles
    SELECT available_copies INTO v_available_copies
    FROM books
    WHERE id = p_book_id FOR UPDATE;
    
    IF v_available_copies IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El libro no existe';
    END IF;
    
    IF v_available_copies <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No hay copias disponibles del libro';
    END IF;
    
    -- Verificar préstamos activos del usuario
    SELECT COUNT(*) INTO v_active_loans
    FROM loans
    WHERE user_id = p_user_id AND status = 'active';
    
    IF v_active_loans >= 3 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El usuario ya tiene 3 préstamos activos';
    END IF;
    
    -- Calcular fecha de vencimiento
    SET v_due_date = DATE_ADD(CURDATE(), INTERVAL p_loan_days DAY);
    
    -- Crear el préstamo
    INSERT INTO loans (user_id, book_id, loan_date, due_date, status)
    VALUES (p_user_id, p_book_id, CURDATE(), v_due_date, 'active');
    
    SET v_loan_id = LAST_INSERT_ID();
    
    -- Actualizar copias disponibles
    UPDATE books
    SET available_copies = available_copies - 1
    WHERE id = p_book_id;
    
    -- Confirmar transacción
    COMMIT;
    
    -- Retornar el ID del préstamo creado
    SELECT v_loan_id AS loan_id, v_due_date AS due_date;
END //
DELIMITER ;

-- Procedure: Devolver un libro
DELIMITER //
CREATE PROCEDURE sp_return_book(
    IN p_loan_id INT
)
BEGIN
    DECLARE v_book_id INT;
    DECLARE v_user_id INT;
    DECLARE v_due_date DATE;
    DECLARE v_days_late INT;
    DECLARE v_fine DECIMAL(10,2);
    DECLARE v_loan_status VARCHAR(20);
    
    -- Iniciar transacción
    START TRANSACTION;
    
    -- Obtener información del préstamo
    SELECT book_id, user_id, due_date, status
    INTO v_book_id, v_user_id, v_due_date, v_loan_status
    FROM loans
    WHERE id = p_loan_id FOR UPDATE;
    
    IF v_book_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El préstamo no existe';
    END IF;
    
    IF v_loan_status = 'returned' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El libro ya fue devuelto';
    END IF;
    
    -- Calcular días de retraso y multa
    SET v_days_late = DATEDIFF(CURDATE(), v_due_date);
    
    IF v_days_late > 0 THEN
        SET v_fine = v_days_late * 2.00; -- $2.00 por día de retraso
    ELSE
        SET v_fine = 0.00;
    END IF;
    
    -- Actualizar el préstamo
    UPDATE loans
    SET return_date = CURDATE(),
        fine_amount = v_fine,
        status = 'returned'
    WHERE id = p_loan_id;
    
    -- Incrementar copias disponibles
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE id = v_book_id;
    
    -- Actualizar multas totales del usuario
    IF v_fine > 0 THEN
        UPDATE users
        SET total_fines = total_fines + v_fine
        WHERE id = v_user_id;
    END IF;
    
    -- Confirmar transacción
    COMMIT;
    
    -- Retornar información de la devolución
    SELECT 
        p_loan_id AS loan_id,
        v_days_late AS days_late,
        v_fine AS fine_amount,
        CURDATE() AS return_date;
END //
DELIMITER ;

-- Procedure: Obtener libros más prestados
DELIMITER //
CREATE PROCEDURE sp_get_popular_books(
    IN p_limit INT
)
BEGIN
    SELECT 
        b.id,
        b.title,
        b.author,
        b.isbn,
        COUNT(l.id) AS total_loans,
        b.available_copies,
        b.total_copies
    FROM books b
    INNER JOIN loans l ON b.id = l.book_id
    GROUP BY b.id, b.title, b.author, b.isbn, b.available_copies, b.total_copies
    ORDER BY total_loans DESC
    LIMIT p_limit;
END //
DELIMITER ;

-- Procedure: Obtener usuarios con multas pendientes
DELIMITER //
CREATE PROCEDURE sp_get_users_with_fines()
BEGIN
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.total_fines,
        COUNT(l.id) AS active_loans
    FROM users u
    LEFT JOIN loans l ON u.id = l.user_id AND l.status = 'active'
    WHERE u.total_fines > 0
    GROUP BY u.id, u.full_name, u.email, u.phone, u.total_fines
    ORDER BY u.total_fines DESC;
END //
DELIMITER ;

-- Procedure: Actualizar estado de préstamos vencidos
DELIMITER //
CREATE PROCEDURE sp_update_overdue_loans()
BEGIN
    UPDATE loans
    SET status = 'overdue'
    WHERE status = 'active'
    AND due_date < CURDATE();
    
    SELECT ROW_COUNT() AS updated_loans;
END //
DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Validar límite de préstamos antes de insertar
DELIMITER //
CREATE TRIGGER trg_before_insert_loan
BEFORE INSERT ON loans
FOR EACH ROW
BEGIN
    DECLARE v_active_loans INT;
    DECLARE v_user_active BOOLEAN;
    
    -- Verificar si el usuario está activo
    SELECT is_active INTO v_user_active
    FROM users
    WHERE id = NEW.user_id;
    
    IF NOT v_user_active THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El usuario no está activo';
    END IF;
    
    -- Contar préstamos activos (este trigger se activa ANTES del procedure)
    SELECT COUNT(*) INTO v_active_loans
    FROM loans
    WHERE user_id = NEW.user_id AND status = 'active';
    
    IF v_active_loans >= 3 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El usuario ya tiene el máximo de préstamos activos';
    END IF;
END //
DELIMITER ;

-- Trigger: Registrar en historial después de crear préstamo
DELIMITER //
CREATE TRIGGER trg_after_insert_loan
AFTER INSERT ON loans
FOR EACH ROW
BEGIN
    INSERT INTO loan_history (loan_id, action_type, details)
    VALUES (
        NEW.id,
        'loan_created',
        CONCAT('Préstamo creado. Fecha de vencimiento: ', NEW.due_date)
    );
END //
DELIMITER ;

-- Trigger: Registrar devolución en historial
DELIMITER //
CREATE TRIGGER trg_after_update_loan
AFTER UPDATE ON loans
FOR EACH ROW
BEGIN
    IF OLD.status != 'returned' AND NEW.status = 'returned' THEN
        INSERT INTO loan_history (loan_id, action_type, details)
        VALUES (
            NEW.id,
            'book_returned',
            CONCAT('Libro devuelto. Multa aplicada: $', NEW.fine_amount)
        );
        
        IF NEW.fine_amount > 0 THEN
            INSERT INTO loan_history (loan_id, action_type, details)
            VALUES (
                NEW.id,
                'fine_applied',
                CONCAT('Multa por retraso: $', NEW.fine_amount)
            );
        END IF;
    END IF;
END //
DELIMITER ;

-- Trigger: Prevenir eliminación de libros con préstamos activos
DELIMITER //
CREATE TRIGGER trg_before_delete_book
BEFORE DELETE ON books
FOR EACH ROW
BEGIN
    DECLARE v_active_loans INT;
    
    SELECT COUNT(*) INTO v_active_loans
    FROM loans
    WHERE book_id = OLD.id AND status IN ('active', 'overdue');
    
    IF v_active_loans > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se puede eliminar un libro con préstamos activos';
    END IF;
END //
DELIMITER ;

-- ============================================
-- DATOS DE PRUEBA
-- ============================================

-- Insertar libros de prueba
INSERT INTO books (title, author, isbn, category, total_copies, available_copies, publication_year) VALUES
('Cien años de soledad', 'Gabriel García Márquez', '9780060883287', 'Ficción', 5, 5, 1967),
('Don Quijote de la Mancha', 'Miguel de Cervantes', '9788420412146', 'Clásico', 3, 3, 1605),
('El código Da Vinci', 'Dan Brown', '9780307474278', 'Misterio', 4, 4, 2003),
('Harry Potter y la piedra filosofal', 'J.K. Rowling', '9788498382662', 'Fantasía', 6, 6, 1997),
('1984', 'George Orwell', '9780451524935', 'Distopía', 4, 4, 1949),
('Orgullo y prejuicio', 'Jane Austen', '9780141439518', 'Romance', 3, 3, 1813),
('El señor de los anillos', 'J.R.R. Tolkien', '9780618640157', 'Fantasía', 5, 5, 1954),
('Crónica de una muerte anunciada', 'Gabriel García Márquez', '9780307387387', 'Ficción', 3, 3, 1981);

-- Insertar usuarios de prueba
INSERT INTO users (full_name, email, phone, address, registration_date, is_active) VALUES
('Juan Pérez', 'juan.perez@email.com', '555-0101', 'Av. Principal 123', '2024-01-15', TRUE),
('María González', 'maria.gonzalez@email.com', '555-0102', 'Calle Secundaria 456', '2024-02-20', TRUE),
('Carlos Rodríguez', 'carlos.rodriguez@email.com', '555-0103', 'Jr. Libertad 789', '2024-03-10', TRUE),
('Ana Martínez', 'ana.martinez@email.com', '555-0104', 'Av. Los Pinos 321', '2024-04-05', TRUE),
('Luis Torres', 'luis.torres@email.com', '555-0105', 'Calle Las Flores 654', '2024-05-12', FALSE);

-- Crear algunos préstamos de ejemplo
CALL sp_create_loan(1, 1, 14); -- Juan pide "Cien años de soledad" por 14 días
CALL sp_create_loan(2, 3, 14); -- María pide "El código Da Vinci"
CALL sp_create_loan(3, 5, 14); -- Carlos pide "1984"

-- ============================================
-- CONSULTAS ÚTILES DE VERIFICACIÓN
-- ============================================

-- Ver todos los préstamos activos
-- SELECT * FROM loans WHERE status = 'active';

-- Ver historial de movimientos
-- SELECT * FROM loan_history ORDER BY action_date DESC;

-- Ver libros con sus copias disponibles
-- SELECT title, author, available_copies, total_copies FROM books;

-- Probar procedure de libros populares
-- CALL sp_get_popular_books(5);

-- Probar procedure de usuarios con multas
-- CALL sp_get_users_with_fines();

-- Actualizar préstamos vencidos
-- CALL sp_update_overdue_loans();
